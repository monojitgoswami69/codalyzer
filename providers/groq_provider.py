"""
Groq LLM Provider for code complexity analysis.

Handles API communication with Groq's fast inference API.
Supports multiple models with automatic fallback.
"""

import os
import json
import asyncio
from typing import Optional, Any
from dataclasses import dataclass

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)


@dataclass
class GroqConfig:
    """Configuration for Groq API client."""
    
    api_key: str
    model: str = "llama-3.3-70b-versatile"  # Best for complex reasoning
    fallback_model: str = "llama-3.1-8b-instant"  # Faster fallback
    max_tokens: int = 4096
    temperature: float = 0.1  # Low temp for consistent analysis
    timeout: float = 60.0
    max_retries: int = 3
    
    # Available Groq models ranked by capability
    AVAILABLE_MODELS = [
        "llama-3.3-70b-versatile",      # Best reasoning
        "llama-3.1-70b-versatile",      # Great reasoning
        "llama-3.2-90b-vision-preview", # Vision capable
        "mixtral-8x7b-32768",           # Good context
        "llama-3.1-8b-instant",         # Fast
        "gemma2-9b-it",                 # Google model
    ]


class GroqAPIError(Exception):
    """Exception for Groq API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class GroqRateLimitError(GroqAPIError):
    """Rate limit exceeded error."""
    pass


class GroqProvider:
    """
    Groq LLM provider with retry logic and fallback support.
    
    Features:
    - Async HTTP requests for performance
    - Automatic retries with exponential backoff
    - Model fallback on failures
    - JSON response parsing
    - Token usage tracking
    """
    
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    def __init__(self, config: Optional[GroqConfig] = None):
        """
        Initialize Groq provider.
        
        Args:
            config: Optional configuration. If not provided, uses env vars.
        """
        if config is None:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError(
                    "GROQ_API_KEY environment variable not set. "
                    "Get your key from https://console.groq.com"
                )
            config = GroqConfig(api_key=api_key)
        
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None
        self._total_tokens_used = 0
        self._request_count = 0
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.timeout),
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._client
    
    async def close(self):
        """Close HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    )
    async def _make_request(
        self,
        messages: list[dict[str, str]],
        model: str,
        json_mode: bool = False,
    ) -> dict[str, Any]:
        """
        Make API request to Groq.
        
        Args:
            messages: Chat messages
            model: Model to use
            json_mode: Whether to request JSON output
            
        Returns:
            API response dict
        """
        client = await self._get_client()
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        response = await client.post(self.BASE_URL, json=payload)
        
        if response.status_code == 429:
            raise GroqRateLimitError(
                "Rate limit exceeded. Please wait and retry.",
                status_code=429
            )
        
        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("error", {}).get("message", error_detail)
            except:
                pass
            raise GroqAPIError(
                f"API error ({response.status_code}): {error_detail}",
                status_code=response.status_code
            )
        
        return response.json()
    
    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
        use_fallback: bool = True,
    ) -> str:
        """
        Get completion from Groq.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            json_mode: Request JSON formatted response
            use_fallback: Fall back to smaller model on error
            
        Returns:
            Model response text
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        models_to_try = [self.config.model]
        if use_fallback and self.config.fallback_model != self.config.model:
            models_to_try.append(self.config.fallback_model)
        
        last_error = None
        
        for model in models_to_try:
            try:
                response = await self._make_request(messages, model, json_mode)
                
                # Track usage
                usage = response.get("usage", {})
                self._total_tokens_used += usage.get("total_tokens", 0)
                self._request_count += 1
                
                # Extract content
                content = response["choices"][0]["message"]["content"]
                return content.strip()
                
            except GroqRateLimitError:
                # Wait and retry with same model
                await asyncio.sleep(2)
                try:
                    response = await self._make_request(messages, model, json_mode)
                    content = response["choices"][0]["message"]["content"]
                    return content.strip()
                except Exception as e:
                    last_error = e
                    continue
                    
            except Exception as e:
                last_error = e
                continue
        
        raise GroqAPIError(f"All models failed. Last error: {last_error}")
    
    async def complete_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Get JSON completion from Groq.
        
        Args:
            prompt: User prompt  
            system_prompt: Optional system prompt
            
        Returns:
            Parsed JSON dict
        """
        response = await self.complete(
            prompt=prompt,
            system_prompt=system_prompt,
            json_mode=True,
        )
        
        # Try to parse JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(response[start:end])
                except json.JSONDecodeError:
                    pass
            
            raise GroqAPIError(f"Failed to parse JSON response: {response[:200]}...")
    
    @property
    def tokens_used(self) -> int:
        """Total tokens used across all requests."""
        return self._total_tokens_used
    
    @property
    def request_count(self) -> int:
        """Total number of requests made."""
        return self._request_count
    
    def get_stats(self) -> dict[str, Any]:
        """Get usage statistics."""
        return {
            "total_tokens": self._total_tokens_used,
            "requests": self._request_count,
            "model": self.config.model,
        }


# Synchronous wrapper for non-async usage
class GroqProviderSync:
    """Synchronous wrapper around GroqProvider."""
    
    def __init__(self, config: Optional[GroqConfig] = None):
        self._async_provider = GroqProvider(config)
    
    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """Synchronous completion."""
        return asyncio.run(
            self._async_provider.complete(prompt, system_prompt, json_mode)
        )
    
    def complete_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> dict[str, Any]:
        """Synchronous JSON completion."""
        return asyncio.run(
            self._async_provider.complete_json(prompt, system_prompt)
        )
    
    def close(self):
        """Close the provider."""
        asyncio.run(self._async_provider.close())
    
    def get_stats(self) -> dict[str, Any]:
        """Get usage statistics."""
        return self._async_provider.get_stats()
