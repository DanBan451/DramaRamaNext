"""
Claude Adapter - Implementation of LLM port using Anthropic Claude
"""
from typing import AsyncGenerator, List, Dict
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

    async def generate_stream_with_system(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response with a caller-supplied system prompt.

        Used by flows like the course intake chatbot whose system prompt
        differs from the element-coach default in `generate_stream`.
        """
        kwargs = dict(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        if system:
            kwargs["system"] = system
        with self.client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield text

    async def generate_stream_with_messages(
        self,
        messages: List[Dict[str, str]],
        system: str = "",
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        """Stream a response given a structured message history.

        Use this instead of `generate_stream_with_system` when the caller
        wants Claude to see proper {role: user|assistant} turns. Cramming
        the conversation into a single user prompt causes the model to
        hallucinate role-prefixed turns ("User: ...") in its output.
        """
        kwargs = dict(
            model=self.model,
            max_tokens=max_tokens,
            messages=messages,
        )
        if system:
            kwargs["system"] = system
        with self.client.messages.stream(**kwargs) as stream:
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
    
