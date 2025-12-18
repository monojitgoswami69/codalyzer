"""
Prompt templates for code complexity analysis.

Contains carefully crafted prompts for accurate complexity analysis.
"""

from typing import Optional
from .models import AnalysisOptions


class PromptBuilder:
    """
    Build prompts for code complexity analysis.
    
    Uses structured prompting for consistent, accurate results.
    """
    
    SYSTEM_PROMPT = """You are an expert computer scientist and algorithm analyst specializing in computational complexity theory.

Your task is to analyze code and determine its time and space complexity using Big-O notation.

## Your Expertise Includes:
- Algorithm analysis and complexity theory
- Data structure operations and their complexities
- Loop analysis (nested, dependent, independent)
- Recursive algorithm analysis (Master theorem, recurrence relations)
- Amortized analysis
- Space complexity including auxiliary and input space

## Analysis Guidelines:
1. **Identify Variables**: Clearly define what n represents (array length, input size, etc.)
2. **Loop Analysis**: 
   - Single loop over n elements: O(n)
   - Nested loops: Multiply complexities
   - Loops with logarithmic increments (i*=2): O(log n)
3. **Recursive Analysis**:
   - Identify recurrence relation
   - Apply Master theorem when applicable
4. **Space Analysis**:
   - Count auxiliary data structures
   - Consider recursion stack depth
   - Note if space is input-dependent

## Big-O Classes (from best to worst):
- O(1): Constant - hash table lookup, array access
- O(log n): Logarithmic - binary search
- O(n): Linear - single loop, linear search  
- O(n log n): Linearithmic - merge sort, heap sort
- O(n²): Quadratic - nested loops, bubble sort
- O(n³): Cubic - triple nested loops
- O(2^n): Exponential - recursive fibonacci without memoization
- O(n!): Factorial - permutation generation

Always provide your analysis in the exact JSON format requested."""

    @staticmethod
    def build_analysis_prompt(
        code: str,
        options: Optional[AnalysisOptions] = None,
    ) -> str:
        """
        Build the main analysis prompt.
        
        Args:
            code: Source code to analyze
            options: Analysis options
            
        Returns:
            Formatted prompt string
        """
        if options is None:
            options = AnalysisOptions()
        
        language_context = ""
        if options.language_hint:
            language_context = f"\nThe code is written in {options.language_hint}."
        
        functions_instruction = ""
        if options.analyze_functions:
            functions_instruction = """
- For EACH function/method in the code, provide individual analysis in the "functions" array
- Include function name, its specific time/space complexity, and explanation"""
        
        suggestions_instruction = ""
        if options.include_suggestions:
            suggestions_instruction = """
- Provide practical optimization suggestions if the complexity can be improved"""
        
        case_analysis = ""
        if options.include_best_worst_case:
            case_analysis = """
- For each function, include best_case, worst_case, and average_case complexity when they differ"""
        
        prompt = f"""Analyze the following code and determine its time and space complexity.
{language_context}

## Code to Analyze:
```
{code}
```

## Required Analysis:
1. Detect the programming language
2. Determine the overall time complexity (Big-O notation)
3. Determine the overall space complexity (Big-O notation)  
4. Provide a clear summary of the analysis
5. Give a detailed explanation of how you arrived at the complexity
{functions_instruction}
{suggestions_instruction}
{case_analysis}

## Response Format (JSON):
Return your analysis as a JSON object with this exact structure:

{{
    "language": "detected programming language",
    "overall_time_complexity": "O(...)",
    "overall_space_complexity": "O(...)",
    "summary": "Brief 1-2 sentence summary",
    "detailed_explanation": "Detailed step-by-step analysis explaining how you determined the complexity. Include variable definitions, loop analysis, and any relevant observations.",
    "functions": [
        {{
            "name": "function_name",
            "time_complexity": "O(...)",
            "space_complexity": "O(...)", 
            "explanation": "Why this function has this complexity",
            "line_start": 1,
            "line_end": 10,
            "variables": {{"n": "length of input array"}},
            "best_case": "O(...) if different",
            "worst_case": "O(...) if different",
            "average_case": "O(...) if different"
        }}
    ],
    "optimization_suggestions": [
        "Specific suggestion 1",
        "Specific suggestion 2"
    ],
    "confidence_score": 0.95
}}

Important:
- Use standard Big-O notation (O(1), O(n), O(n²), O(log n), O(n log n), etc.)
- Be precise - if it's O(n+m), say so; if it's O(n*m), say that
- The confidence_score should reflect how certain you are (0.0 to 1.0)
- If multiple complexities exist (branching), give the worst case as overall
- Consider both auxiliary space and input space for space complexity

Respond ONLY with valid JSON, no additional text."""

        return prompt

    @staticmethod 
    def build_quick_analysis_prompt(code: str) -> str:
        """
        Build a simpler prompt for quick analysis.
        
        Args:
            code: Source code to analyze
            
        Returns:
            Formatted prompt string
        """
        return f"""Quickly analyze this code's complexity:

```
{code}
```

Respond with JSON:
{{
    "language": "language name",
    "overall_time_complexity": "O(...)",
    "overall_space_complexity": "O(...)",
    "summary": "Brief explanation",
    "detailed_explanation": "How you determined this",
    "functions": [],
    "optimization_suggestions": [],
    "confidence_score": 0.8
}}

Be concise but accurate. JSON only."""

    @staticmethod
    def build_function_extraction_prompt(code: str) -> str:
        """
        Build prompt to extract functions from code.
        
        Args:
            code: Source code
            
        Returns:
            Formatted prompt string
        """
        return f"""Extract all functions/methods from this code:

```
{code}
```

Respond with JSON:
{{
    "language": "detected language",
    "functions": [
        {{
            "name": "function_name",
            "line_start": 1,
            "line_end": 10,
            "code": "the function code"
        }}
    ]
}}

JSON only."""

    @staticmethod
    def build_comparison_prompt(code1: str, code2: str) -> str:
        """
        Build prompt to compare complexity of two code snippets.
        
        Args:
            code1: First code snippet
            code2: Second code snippet
            
        Returns:
            Formatted prompt string
        """
        return f"""Compare the complexity of these two code implementations:

## Code A:
```
{code1}
```

## Code B:
```
{code2}
```

Respond with JSON:
{{
    "code_a": {{
        "time_complexity": "O(...)",
        "space_complexity": "O(...)"
    }},
    "code_b": {{
        "time_complexity": "O(...)",
        "space_complexity": "O(...)"
    }},
    "comparison": "Which is better and why",
    "winner": "A or B or tie",
    "recommendation": "Which to use in what scenarios"
}}

JSON only."""
