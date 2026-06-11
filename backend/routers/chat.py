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
    response: str
    trace_id: str = Field(..., alias="traceId")

@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Invoke the GCP agent builder and return response with trace ID."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        result = await invoke_agent(prompt=req.message)
        
        # If there's an error in invoke_agent, return it or raise
        response_text = result.get("response", "")
        trace_id = result.get("trace_id", "")
        
        return ChatResponse(
            response=response_text,
            traceId=trace_id
        )
    except Exception as e:
        log.exception("Chat endpoint failed")
        raise HTTPException(status_code=500, detail=f"Internal chat error: {e}")
