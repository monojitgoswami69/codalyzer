"""
Core Code Complexity Analyzer.

Main engine that orchestrates code analysis using LLM.
"""

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Optional, Union
from datetime import datetime, timedelta

from .models import (
    CodeComplexityResult,
    FunctionComplexity,
    AnalysisOptions,
    AnalysisError,
)
from .prompts import PromptBuilder
from providers.groq_provider import GroqProvider, GroqConfig, GroqAPIError


class AnalysisCache:
    """
    Simple in-memory cache for analysis results.
    
    Prevents redundant API calls for identical code.
    """
    
    def __init__(self, ttl_minutes: int = 60):
        self._cache: dict[str, tuple[CodeComplexityResult, datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)
    
    @staticmethod
    def _hash_code(code: str) -> str:
        """Generate hash for code string."""
        return hashlib.sha256(code.encode()).hexdigest()[:16]
    
    def get(self, code: str) -> Optional[CodeComplexityResult]:
        """Get cached result if exists and not expired."""
        key = self._hash_code(code)
        if key in self._cache:
            result, timestamp = self._cache[key]
            if datetime.now() - timestamp < self._ttl:
                return result
            # Expired, remove it
            del self._cache[key]
        return None
    
    def set(self, code: str, result: CodeComplexityResult) -> None:
        """Cache analysis result."""
        key = self._hash_code(code)
        self._cache[key] = (result, datetime.now())
    
    def clear(self) -> None:
        """Clear all cached results."""
        self._cache.clear()


class CodeComplexityAnalyzer:
    """
    Main code complexity analyzer.
    
    Features:
    - Analyze any programming language
    - Support for file or string input
    - Result caching
    - Async and sync interfaces
    - Batch analysis
    """
    
    def __init__(
        self,
        groq_config: Optional[GroqConfig] = None,
        cache_enabled: bool = True,
        cache_ttl_minutes: int = 60,
    ):
        """
        Initialize analyzer.
        
        Args:
            groq_config: Optional Groq configuration
            cache_enabled: Enable result caching
            cache_ttl_minutes: Cache TTL in minutes
        """
        self._groq_config = groq_config
        self._provider: Optional[GroqProvider] = None
        self._cache = AnalysisCache(cache_ttl_minutes) if cache_enabled else None
        self._prompt_builder = PromptBuilder()
    
    async def _get_provider(self) -> GroqProvider:
        """Get or create Groq provider."""
        if self._provider is None:
            self._provider = GroqProvider(self._groq_config)
        return self._provider
    
    async def close(self) -> None:
        """Close provider connection."""
        if self._provider:
            await self._provider.close()
            self._provider = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    def _parse_result(self, response: dict) -> CodeComplexityResult:
        """Parse LLM response into structured result."""
        # Parse functions
        functions = []
        for func_data in response.get("functions", []):
            try:
                func = FunctionComplexity(
                    name=func_data.get("name", "unknown"),
                    time_complexity=func_data.get("time_complexity", "Unknown"),
                    space_complexity=func_data.get("space_complexity", "Unknown"),
                    explanation=func_data.get("explanation", ""),
                    line_start=func_data.get("line_start"),
                    line_end=func_data.get("line_end"),
                    variables=func_data.get("variables"),
                    best_case=func_data.get("best_case"),
                    worst_case=func_data.get("worst_case"),
                    average_case=func_data.get("average_case"),
                )
                functions.append(func)
            except Exception:
                continue
        
        # Build result
        return CodeComplexityResult(
            language=response.get("language", "Unknown"),
            overall_time_complexity=response.get("overall_time_complexity", "Unknown"),
            overall_space_complexity=response.get("overall_space_complexity", "Unknown"),
            summary=response.get("summary", "Analysis completed"),
            detailed_explanation=response.get("detailed_explanation", ""),
            functions=functions,
            optimization_suggestions=response.get("optimization_suggestions", []),
            confidence_score=min(1.0, max(0.0, response.get("confidence_score", 0.8))),
        )
    
    async def analyze(
        self,
        code: str,
        options: Optional[AnalysisOptions] = None,
    ) -> CodeComplexityResult:
        """
        Analyze code complexity.
        
        Args:
            code: Source code string to analyze
            options: Analysis options
            
        Returns:
            CodeComplexityResult with analysis
            
        Raises:
            GroqAPIError: If API call fails
            ValueError: If code is empty
        """
        if not code or not code.strip():
            raise ValueError("Code cannot be empty")
        
        # Normalize code
        code = code.strip()
        
        # Check cache
        if self._cache:
            cached = self._cache.get(code)
            if cached:
                return cached
        
        # Build prompt
        if options is None:
            options = AnalysisOptions()
        
        prompt = self._prompt_builder.build_analysis_prompt(code, options)
        
        # Get provider and analyze
        provider = await self._get_provider()
        
        try:
            response = await provider.complete_json(
                prompt=prompt,
                system_prompt=self._prompt_builder.SYSTEM_PROMPT,
            )
            
            result = self._parse_result(response)
            
            # Cache result
            if self._cache:
                self._cache.set(code, result)
            
            return result
            
        except json.JSONDecodeError as e:
            raise GroqAPIError(f"Failed to parse analysis response: {e}")
    
    async def analyze_file(
        self,
        file_path: Union[str, Path],
        options: Optional[AnalysisOptions] = None,
    ) -> CodeComplexityResult:
        """
        Analyze code from a file.
        
        Args:
            file_path: Path to source file
            options: Analysis options
            
        Returns:
            CodeComplexityResult with analysis
        """
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        if not path.is_file():
            raise ValueError(f"Not a file: {path}")
        
        # Read file
        code = path.read_text(encoding='utf-8')
        
        # Detect language from extension if not specified
        if options is None:
            options = AnalysisOptions()
        
        if not options.language_hint:
            ext_to_lang = {
                '.py': 'Python',
                '.js': 'JavaScript',
                '.ts': 'TypeScript',
                '.java': 'Java',
                '.cpp': 'C++',
                '.c': 'C',
                '.go': 'Go',
                '.rs': 'Rust',
                '.rb': 'Ruby',
                '.php': 'PHP',
                '.swift': 'Swift',
                '.kt': 'Kotlin',
                '.cs': 'C#',
                '.scala': 'Scala',
                '.r': 'R',
                '.m': 'MATLAB',
                '.jl': 'Julia',
                '.lua': 'Lua',
                '.pl': 'Perl',
                '.sh': 'Shell',
                '.sql': 'SQL',
            }
            options.language_hint = ext_to_lang.get(path.suffix.lower())
        
        return await self.analyze(code, options)
    
    async def analyze_quick(self, code: str) -> CodeComplexityResult:
        """
        Quick analysis with minimal prompting.
        
        Faster but less detailed than full analysis.
        
        Args:
            code: Source code string
            
        Returns:
            CodeComplexityResult with basic analysis
        """
        if not code or not code.strip():
            raise ValueError("Code cannot be empty")
        
        code = code.strip()
        
        # Check cache
        if self._cache:
            cached = self._cache.get(code)
            if cached:
                return cached
        
        prompt = self._prompt_builder.build_quick_analysis_prompt(code)
        
        provider = await self._get_provider()
        response = await provider.complete_json(
            prompt=prompt,
            system_prompt="You are an algorithm complexity analyst. Respond with JSON only.",
        )
        
        result = self._parse_result(response)
        
        if self._cache:
            self._cache.set(code, result)
        
        return result
    
    async def compare(
        self,
        code1: str,
        code2: str,
    ) -> dict:
        """
        Compare complexity of two code implementations.
        
        Args:
            code1: First code snippet
            code2: Second code snippet
            
        Returns:
            Comparison result dict
        """
        prompt = self._prompt_builder.build_comparison_prompt(code1, code2)
        
        provider = await self._get_provider()
        return await provider.complete_json(
            prompt=prompt,
            system_prompt="You are an algorithm complexity analyst. Compare the two implementations. JSON only.",
        )
    
    async def analyze_batch(
        self,
        code_snippets: list[str],
        options: Optional[AnalysisOptions] = None,
    ) -> list[Union[CodeComplexityResult, AnalysisError]]:
        """
        Analyze multiple code snippets.
        
        Note: Processes sequentially to respect rate limits.
        
        Args:
            code_snippets: List of code strings
            options: Analysis options
            
        Returns:
            List of results (or errors)
        """
        results = []
        
        for code in code_snippets:
            try:
                result = await self.analyze(code, options)
                results.append(result)
            except Exception as e:
                results.append(AnalysisError(
                    error_type=type(e).__name__,
                    message=str(e),
                    recoverable=True,
                ))
            
            # Small delay between requests
            await asyncio.sleep(0.5)
        
        return results
    
    def get_stats(self) -> dict:
        """Get analyzer statistics."""
        stats = {
            "cache_enabled": self._cache is not None,
        }
        if self._provider:
            stats.update(self._provider.get_stats())
        return stats
    
    # Synchronous convenience methods
    def analyze_sync(
        self,
        code: str,
        options: Optional[AnalysisOptions] = None,
    ) -> CodeComplexityResult:
        """Synchronous version of analyze()."""
        return asyncio.run(self.analyze(code, options))
    
    def analyze_file_sync(
        self,
        file_path: Union[str, Path],
        options: Optional[AnalysisOptions] = None,
    ) -> CodeComplexityResult:
        """Synchronous version of analyze_file()."""
        return asyncio.run(self.analyze_file(file_path, options))


# Module-level convenience function
def analyze_complexity(
    code: str,
    options: Optional[AnalysisOptions] = None,
) -> CodeComplexityResult:
    """
    Convenience function to analyze code complexity.
    
    Args:
        code: Source code string
        options: Analysis options
        
    Returns:
        CodeComplexityResult
    """
    analyzer = CodeComplexityAnalyzer(cache_enabled=False)
    try:
        return analyzer.analyze_sync(code, options)
    finally:
        asyncio.run(analyzer.close())
