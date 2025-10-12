from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio
from typing import Dict, List
import json

router = APIRouter()

# Store queues per group
announcement_subscribers: Dict[int, List[asyncio.Queue]] = {}
document_subscribers: Dict[int, List[asyncio.Queue]] = {}

async def broadcast_announcement(group_id: int, announcement: dict):
    """Send new announcement to all connected clients in a group"""
    for queue in announcement_subscribers.get(group_id, []):
        await queue.put(json.dumps(announcement))

async def broadcast_document(group_id: int, document: dict):
    """Send new document to all connected clients in a group"""
    for queue in document_subscribers.get(group_id, []):
        await queue.put(json.dumps(document))


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

