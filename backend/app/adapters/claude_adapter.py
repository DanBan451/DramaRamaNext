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
    
    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Generate streaming response from Claude"""
        with self.client.messages.stream(
            model=self.model,
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt}
            ],
            system="You are a helpful thinking coach who guides users through the 5 Elements of Effective Thinking without giving away solutions. Be encouraging, specific, and concise."
        ) as stream:
            for text in stream.text_stream:
                yield text
    
