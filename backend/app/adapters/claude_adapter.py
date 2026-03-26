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
        self.model = "claude-sonnet-4-20250514"  # Sonnet 4 for better coaching quality

    async def generate_stream(self, prompt: str, max_tokens: int = 200) -> AsyncGenerator[str, None]:
        """Generate streaming response from Claude"""
        with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "user", "content": prompt}
            ],
            system=(
                "You are a thinking coach helping a user apply the 5 Elements of Effective Thinking to an AI-utilization puzzle. "
                "Your primary job is to train the user to think effectively about how to use AI. "
                "You coach the THINKING PROCESS — the quality of how they apply the current element matters more than whether they reach the solution."
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
    
