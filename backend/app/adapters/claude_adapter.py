"""
Claude Adapter - Implementation of LLM port using Anthropic Claude
"""
from typing import AsyncGenerator
import anthropic

from app.core.config import settings
from app.ports.llm import LLMClient

class ClaudeStreamingAdapter(LLMClient):
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-haiku-20240307"  # Fast and cheap for MVP

    async def generate_stream(self, prompt: str, max_tokens: int = 500) -> AsyncGenerator[str, None]:
        """Generate streaming response from Claude"""
        with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ],
            system=(
                "You are a thinking coach who guides users through the 5 Elements of Effective Thinking without giving away solutions. "
                "Be encouraging, specific, and concise, but stay grounded in what the user actually wrote. "
                "Do not fabricate strengths or evidence; if responses are low-signal (placeholder/gibberish), say you cannot assess yet and ask for more concrete thinking."
            )
        ) as stream:
            for text in stream.text_stream:
                yield text

    async def generate_text(self, prompt: str, system: str = "", max_tokens: int = 1500) -> str:
        """Generate a complete (non-streaming) response from Claude."""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
            **({"system": system} if system else {}),
        )
        return message.content[0].text if message.content else ""
    
