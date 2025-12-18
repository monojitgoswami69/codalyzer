"""
Data models for code complexity analysis.

Uses Pydantic for validation and serialization.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ComplexityClass(str, Enum):
    """Standard Big-O complexity classes."""
    
    CONSTANT = "O(1)"
    LOGARITHMIC = "O(log n)"
    LINEAR = "O(n)"
    LINEARITHMIC = "O(n log n)"
    QUADRATIC = "O(n²)"
    CUBIC = "O(n³)"
    POLYNOMIAL = "O(n^k)"
    EXPONENTIAL = "O(2^n)"
    FACTORIAL = "O(n!)"
    UNKNOWN = "Unknown"
    
    @classmethod
    def from_string(cls, value: str) -> "ComplexityClass":
        """Parse a complexity string to enum value."""
        normalized = value.strip().upper().replace(" ", "")
        
        mapping = {
            "O(1)": cls.CONSTANT,
            "CONSTANT": cls.CONSTANT,
            "O(LOGN)": cls.LOGARITHMIC,
            "O(LOG(N))": cls.LOGARITHMIC,
            "LOGARITHMIC": cls.LOGARITHMIC,
            "O(N)": cls.LINEAR,
            "LINEAR": cls.LINEAR,
            "O(NLOGN)": cls.LINEARITHMIC,
            "O(NLOG(N))": cls.LINEARITHMIC,
            "LINEARITHMIC": cls.LINEARITHMIC,
            "O(N^2)": cls.QUADRATIC,
            "O(N²)": cls.QUADRATIC,
            "QUADRATIC": cls.QUADRATIC,
            "O(N^3)": cls.CUBIC,
            "O(N³)": cls.CUBIC,
            "CUBIC": cls.CUBIC,
            "O(N^K)": cls.POLYNOMIAL,
            "POLYNOMIAL": cls.POLYNOMIAL,
            "O(2^N)": cls.EXPONENTIAL,
            "EXPONENTIAL": cls.EXPONENTIAL,
            "O(N!)": cls.FACTORIAL,
            "FACTORIAL": cls.FACTORIAL,
        }
        
        return mapping.get(normalized, cls.UNKNOWN)


class FunctionComplexity(BaseModel):
    """Complexity analysis for a single function/method."""
    
    name: str = Field(description="Function or method name")
    time_complexity: str = Field(description="Time complexity in Big-O notation")
    space_complexity: str = Field(description="Space complexity in Big-O notation")
    explanation: str = Field(description="Detailed explanation of the analysis")
    line_start: Optional[int] = Field(default=None, description="Starting line number")
    line_end: Optional[int] = Field(default=None, description="Ending line number")
    variables: Optional[dict[str, str]] = Field(
        default=None, 
        description="Key variables and what they represent (e.g., n = array length)"
    )
    best_case: Optional[str] = Field(default=None, description="Best case complexity")
    worst_case: Optional[str] = Field(default=None, description="Worst case complexity")
    average_case: Optional[str] = Field(default=None, description="Average case complexity")


class CodeComplexityResult(BaseModel):
    """Complete complexity analysis result for a code snippet."""
    
    language: str = Field(description="Detected programming language")
    overall_time_complexity: str = Field(description="Overall time complexity")
    overall_space_complexity: str = Field(description="Overall space complexity")
    summary: str = Field(description="Brief summary of the analysis")
    detailed_explanation: str = Field(description="Detailed breakdown of complexity analysis")
    functions: list[FunctionComplexity] = Field(
        default_factory=list,
        description="Per-function complexity breakdown"
    )
    optimization_suggestions: list[str] = Field(
        default_factory=list,
        description="Suggestions for improving complexity"
    )
    confidence_score: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Confidence in the analysis (0-1)"
    )
    
    def to_summary_string(self) -> str:
        """Return a formatted summary string."""
        lines = [
            f"Language: {self.language}",
            f"Time Complexity: {self.overall_time_complexity}",
            f"Space Complexity: {self.overall_space_complexity}",
            f"Confidence: {self.confidence_score:.0%}",
            "",
            "Summary:",
            self.summary,
        ]
        return "\n".join(lines)


class AnalysisOptions(BaseModel):
    """Configuration options for code analysis."""
    
    analyze_functions: bool = Field(
        default=True,
        description="Analyze individual functions separately"
    )
    include_suggestions: bool = Field(
        default=True,
        description="Include optimization suggestions"
    )
    detailed_mode: bool = Field(
        default=True,
        description="Provide detailed explanations"
    )
    detect_language: bool = Field(
        default=True,
        description="Auto-detect programming language"
    )
    language_hint: Optional[str] = Field(
        default=None,
        description="Hint for programming language if known"
    )
    include_best_worst_case: bool = Field(
        default=False,
        description="Include best/worst/average case analysis"
    )


class AnalysisError(BaseModel):
    """Error information from failed analysis."""
    
    error_type: str = Field(description="Type of error")
    message: str = Field(description="Error message")
    recoverable: bool = Field(default=False, description="Whether analysis can be retried")
