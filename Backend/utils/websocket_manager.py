from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # key: group_id, value: list of connected websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: int):
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: int):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast(self, group_id: int, message: dict):
        if group_id in self.active_connections:
            for connection in self.active_connections[group_id]:
                await connection.send_json(message)