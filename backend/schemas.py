from pydantic import BaseModel
from typing import Optional

class ChatMessageBase(BaseModel):
    sender_id: int
    body: str
    reply_to: Optional[int] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int

    class Config:
        from_attributes = True

