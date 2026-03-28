from pydantic import BaseModel, Field
from typing import List, Optional


class Message(BaseModel):
    role: str = Field(..., example="user")  # user / assistant
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    temperature: Optional[float] = 1.0
    max_tokens: Optional[int] = 2048


class ChatResponse(BaseModel):
    response: str