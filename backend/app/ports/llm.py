"""
LLM Port - Abstract interface for LLM clients
"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator

class LLMClient(ABC):
    @abstractmethod
    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Generate streaming response from LLM"""
        pass
    
