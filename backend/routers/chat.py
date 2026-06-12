"""/api/chat — Chat entrypoint for invoking the GCP Discovery Engine agent.

Allows the user to send messages to the Agent Builder agent and retrieve
the response alongside the generated Arize Phoenix trace ID.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..vertex.client import invoke_agent

log = logging.getLogger("aegis.chat")
router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    response: str | None = None
    trace_id: str | None = Field(None, alias="traceId")

@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Invoke the GCP agent builder and return response with trace ID."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        result = await invoke_agent(prompt=req.message)
        
        response_text = result.get("response", "")
        trace_id = result.get("trace_id", None) or None
        
        # If GCP call returned an error message, fall back gracefully
        if not response_text or response_text.startswith("Error") or "Discovery Engine error" in response_text:
            return ChatResponse(
                answer="Agent unavailable. Please try again.",
                response="Agent unavailable. Please try again.",
                traceId=trace_id
            )
            
        return ChatResponse(
            answer=response_text,
            response=response_text,
            traceId=trace_id
        )
    except Exception as e:
        log.exception("Chat endpoint failed")
        return ChatResponse(
            answer="Agent unavailable. Please try again.",
            response="Agent unavailable. Please try again.",
            traceId=None
        )
