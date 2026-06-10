"""Gemini LLM-as-a-judge.

PURPOSE
-------
The heuristic loop detector can produce false positives (e.g. the agent is
genuinely being thorough, or the user asked the agent to repeat a tool
call). Before triggering a heal (which patches the agent's instructions
in production), the worker consults Gemini to confirm:

  1. Is this really a runaway loop, or is it intentional?
  2. If yes, how severe?
  3. What tighter system prompt should the agent receive?

We use the official `google-genai` SDK. The API key is read from
`GEMINI_API_KEY` in /backend/.env and is NEVER sent to the frontend.

OUTPUT
------
A `JudgeVerdict` with a structured shape. The verdict's `recommendation`
field becomes the new instructions that the worker patches into Vertex AI.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from ..config import settings
from ..mcp.client import SpanEvent

log = logging.getLogger("aegis.gemini")


@dataclass
class JudgeVerdict:
    loop_detected: bool
    severity: str           # "low" | "medium" | "high" | "critical"
    confidence: float       # 0..1
    reason: str
    recommendation: str     # New system prompt to apply (if loop_detected)


# =============================================================================
# Public API
# =============================================================================
async def judge_trace(ev: SpanEvent, model: Optional[str] = None) -> JudgeVerdict:
    """Ask Gemini whether this span is part of a runaway loop.

    Falls back to a conservative local heuristic if the SDK isn't installed
    or the call fails. We NEVER raise — judge failures should not crash the
    worker.
    """
    model = model or settings.judge_model

    prompt = _build_prompt(ev)
    try:
        raw = await _call_gemini(prompt, model=model)
    except Exception as e:
        log.exception("Gemini call failed: %s — using conservative fallback", e)
        return _fallback_verdict(ev, reason=f"judge unavailable: {e}")

    return _parse_verdict(raw, ev)


# =============================================================================
# Internals
# =============================================================================
def _build_prompt(ev: SpanEvent) -> str:
    """Compose the prompt we send to Gemini."""
    return (
        "You are a watchdog for production LLM agents. Decide if a span is "
        "part of a runaway tool-call loop. Reply with a single JSON object.\n\n"
        f"SPAN:\n"
        f"  agent: {ev.agent}\n"
        f"  tool:  {ev.tool}\n"
        f"  tokens: {ev.tokens}\n"
        f"  latency_ms: {ev.latency_ms}\n"
        f"  ts: {ev.ts.isoformat()}\n"
        f"  raw_attributes: {json.dumps(ev.raw.get('attributes', {}), default=str)[:600]}\n\n"
        "Reply strictly as JSON with this shape:\n"
        "{\n"
        '  "loop_detected": true|false,\n'
        '  "severity": "low" | "medium" | "high" | "critical",\n'
        '  "confidence": 0.0..1.0,\n'
        '  "reason": "short reason",\n'
        '  "recommendation": "ONLY IF loop_detected=true: a tighter system prompt the agent should use"\n'
        "}\n"
    )


async def _call_gemini(prompt: str, *, model: str) -> str:
    """Call Gemini and return the raw text response."""
    # Lazy import — tests can stub this out without google-genai installed.
    from google import genai  # type: ignore

    client = genai.Client(api_key=settings.gemini_api_key)
    resp = await asyncio_run_in_thread(
        lambda: client.models.generate_content(
            model=model,
            contents=prompt,
            config={"response_mime_type": "application/json", "temperature": 0.0},
        )
    )
    return getattr(resp, "text", "") or ""


def asyncio_run_in_thread(fn):
    """Tiny helper so async def judge_trace can call sync SDKs cleanly."""
    import asyncio
    return asyncio.to_thread(fn)


def _parse_verdict(raw: str, ev: SpanEvent) -> JudgeVerdict:
    """Parse Gemini's response into a structured verdict."""
    raw = (raw or "").strip()
    # Try to extract a JSON block from the response.
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    payload_text = match.group(0) if match else raw
    try:
        payload = json.loads(payload_text)
    except Exception:
        log.warning("Judge returned non-JSON: %s", raw[:300])
        return _fallback_verdict(ev, reason="judge returned non-JSON output")

    loop_detected = bool(payload.get("loop_detected", False))
    severity = str(payload.get("severity", "medium"))
    if severity not in {"low", "medium", "high", "critical"}:
        severity = "medium"
    try:
        confidence = float(payload.get("confidence", 0.0))
    except Exception:
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))
    reason = str(payload.get("reason", ""))
    recommendation = str(payload.get("recommendation", "")).strip()

    # If Gemini says loop, but didn't give us a prompt, fall back to a
    # conservative local one. We never let an empty prompt into Vertex AI.
    if loop_detected and not recommendation:
        recommendation = _default_recommendation(ev)

    return JudgeVerdict(
        loop_detected=loop_detected,
        severity=severity,
        confidence=confidence,
        reason=reason,
        recommendation=recommendation,
    )


def _fallback_verdict(ev: SpanEvent, *, reason: str) -> JudgeVerdict:
    """Conservative fallback when Gemini is unavailable.

    Rule: only confirm a loop if the tool is a known recursive candidate
    AND the token count is non-trivial. This keeps us from triggering
    heals on noise when the judge is down.
    """
    risky_tools = {"web_search", "kb_lookup", "calculator", "sql_query", "file_read"}
    likely = bool(ev.tool and ev.tool in risky_tools and ev.tokens > 200)
    return JudgeVerdict(
        loop_detected=likely,
        severity="medium" if likely else "low",
        confidence=0.6 if likely else 0.2,
        reason=reason or ("fallback heuristic" if likely else "fallback: looks intentional"),
        recommendation=_default_recommendation(ev) if likely else "",
    )


def _default_recommendation(ev: SpanEvent) -> str:
    return (
        f"You are the {ev.agent} agent.\n\n"
        f"# Tool-use policy\n"
        f"- Use the {ev.tool} tool exactly ONCE per distinct sub-question.\n"
        f"- If a call returns no useful result, reformulate ONCE then respond.\n"
        f"- NEVER repeat an identical tool call within the same session.\n"
        f"- Refuse to keep searching for a clearly impossible object.\n\n"
        f"# Response style\n"
        f"- Keep answers under 200 words unless asked for more.\n"
    )
