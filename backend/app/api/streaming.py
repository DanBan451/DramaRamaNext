"""
SSE streaming helpers.
"""
import json
from typing import AsyncIterator, Callable

from fastapi.responses import StreamingResponse

# Prevent proxies (nginx, Vercel) from buffering the entire response.
SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def streaming_sse_response(gen: Callable) -> StreamingResponse:
    """Return a FastAPI StreamingResponse for an async SSE generator."""
    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


async def sse_stream(async_iter: AsyncIterator[str]) -> AsyncIterator[bytes]:
    """
    Wrap an async iterator of text chunks into Server-Sent Events.
    Each chunk becomes: data: {"text": "..."}\\n\\n
    Followed by a terminator: data: [DONE]\\n\\n

    On error, emits a single data: {"error": "..."}\\n\\n followed by [DONE].
    """
    try:
        async for chunk in async_iter:
            payload = json.dumps({"text": chunk})
            yield f"data: {payload}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"
    except Exception as e:
        err = json.dumps({"error": str(e)})
        yield f"data: {err}\n\n".encode("utf-8")
        yield b"data: [DONE]\n\n"
