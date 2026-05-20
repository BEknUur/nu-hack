from pydantic import BaseModel, Field
from typing import List, Optional, Union


class Message(BaseModel):
    role: str = Field(..., examples=["user"])
    content: Union[str, list] = Field(
        ...,
        examples=["What is the sun angle at this location?"],
    )


class MapContext(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    zoom: Optional[int] = None
    date: Optional[str] = None
    time: Optional[str] = None
    mode: Optional[str] = None
    selectedBuilding: Optional[str] = None


class ChatMessageRequest(BaseModel):
    messages: List[Message]
    context: Optional[MapContext] = None
    language: str = "en"


class ChatMessageResponse(BaseModel):
    response: str
    suggestions: List[str] = Field(default_factory=list)
