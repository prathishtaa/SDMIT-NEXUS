from fastapi import APIRouter,Request
from fastapi.responses import StreamingResponse
import asyncio
from datetime import datetime
from typing import Dict, List
import json
from fastapi.encoders import jsonable_encoder

router = APIRouter()

# Store queues per group
announcement_subscribers: Dict[int, List[asyncio.Queue]] = {}
document_subscribers: Dict[int, List[asyncio.Queue]] = {}

async def broadcast_announcement(group_id: int, announcement: dict):
    """Send new announcement to all connected clients in a group"""
    ann_data = jsonable_encoder(announcement)
    for queue in announcement_subscribers.get(group_id, []):
        await queue.put(json.dumps(ann_data))
        
async def broadcast_document(group_id: int, document_data: dict):
    """Send new document data to all connected clients in a group"""
    # Ensure datetime values are serialized
    for key, value in document_data.items():
        if isinstance(value, datetime):
            document_data[key] = value.isoformat()

    for queue in document_subscribers.get(group_id, []):
        await queue.put(json.dumps(document_data))

async def broadcast_document_delete(group_id: int, document_id: str):
    """Notify all connected clients that a document was deleted"""
    data = {
        "type": "delete_document",
        "document_id": document_id,
    }
    for queue in document_subscribers.get(group_id, []):
        await queue.put(json.dumps(data))


async def broadcast_announcement_delete(group_id: int, announcement_id: str):
    """Notify all connected clients that an announcement was deleted"""
    data = {
        "type": "delete_announcement",
        "announcement_id": announcement_id,
    }
    for queue in announcement_subscribers.get(group_id, []):
        await queue.put(json.dumps(data))

@router.get("/events/announcements/{group_id}")
async def announcements_sse(group_id: int):
    queue = asyncio.Queue()
    if group_id not in announcement_subscribers:
        announcement_subscribers[group_id] = []
    announcement_subscribers[group_id].append(queue)

    async def generator():
        try:
            while True:
                data = await queue.get()  # Wait for a new announcement
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            announcement_subscribers[group_id].remove(queue)

    return StreamingResponse(generator(), media_type="text/event-stream")


@router.get("/events/documents/{group_id}")
async def documents_sse(group_id: int):
    queue = asyncio.Queue()
    if group_id not in document_subscribers:
        document_subscribers[group_id] = []
    document_subscribers[group_id].append(queue)

    async def generator():
        try:
            while True:
                data = await queue.get()  # Wait for a new document
                yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            document_subscribers[group_id].remove(queue)

    return StreamingResponse(generator(), media_type="text/event-stream")

