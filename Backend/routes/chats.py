from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import DoubtClarification, Student, Lecturer
from utils.auth_utils import get_current_user_from_token
from utils.websocket_manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws/group/{group_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    group_id: int,
    db: Session = Depends(get_db)
):
    
    # ✅ Extract token before accepting the connection
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    # ✅ Validate token
    try:
        user_data = get_current_user_from_token(token)
    except ValueError as e:
        await websocket.close(code=1008, reason=str(e))
        return

    # ✅ Accept connection only after successful authentication
    await websocket.accept()

    # 🔹 Fetch user name from DB using role and id
    if user_data["role"] == "student":
        user = db.query(Student).filter(Student.student_id == user_data["id"]).first()
    else:
        user = db.query(Lecturer).filter(Lecturer.lecturer_id == user_data["id"]).first()

    if not user:
        await websocket.close(code=1008)
        return

    current_user = {
        "id": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "name": user.name
    }

    # 🔹 Connect and announce
    await manager.connect(websocket, group_id)
    await manager.broadcast(group_id, {
        "type": "status",
        "message": f"{current_user['name']} joined the chat"
    })

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            # 🟩 Sending new message
            if action == "send":
                message_text = data.get("message")
                parent_id = data.get("parent_id")

                new_message = DoubtClarification(
                    group_id=group_id,
                    sender_id=current_user["id"],
                    sender_role=current_user["role"],
                    message=message_text,
                    parent_doubt_id=parent_id
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)

                await manager.broadcast(group_id, {
                    "type": "message",
                    "doubt_id": new_message.doubt_id,
                    "message": new_message.message,
                    "sender_id": new_message.sender_id,
                    "sender_role": new_message.sender_role.value
                        if hasattr(new_message.sender_role, "value")
                        else new_message.sender_role,
                    "sender_name": current_user["name"],
                    "created_at": str(new_message.created_at),
                    "reply_to": new_message.parent_doubt_id
                })

            # 🟥 Deleting a message
            elif action == "delete":
                doubt_id = data.get("doubt_id")
                msg = db.query(DoubtClarification).filter(
                    DoubtClarification.doubt_id == doubt_id
                ).first()

                if msg and msg.sender_id == current_user["id"]:
                    db.delete(msg)
                    db.commit()
                    await manager.broadcast(group_id, {
                        "type": "delete",
                        "doubt_id": doubt_id
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Cannot delete this message"
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket, group_id)
        await manager.broadcast(group_id, {
            "type": "status",
            "message": f"{current_user['name']} left the chat"
        })
