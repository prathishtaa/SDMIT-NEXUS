from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import ChatMessage
from schemas import ChatMessageResponse
from typing import List

router = APIRouter()

active_connections: List[WebSocket] = []

@router.websocket("/ws/{chat_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: int, user_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            new_message = ChatMessage(
                sender_id=data["sender_id"],
                body=data["body"],
                reply_to=data.get("reply_to"),
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            response = ChatMessageResponse.from_orm(new_message).dict()

            for conn in active_connections:
                await conn.send_json(response)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
