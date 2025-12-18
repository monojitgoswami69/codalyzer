"""Output formatters for complexity analysis results."""

import json
from typing import Optional

from core.models import CodeComplexityResult


def format_result_json(result: CodeComplexityResult, indent: int = 2) -> str:
    """
    Format result as JSON string.
    
    Args:
        result: Analysis result
        indent: JSON indentation
        
    Returns:
        Formatted JSON string
    """
    return result.model_dump_json(indent=indent)


def format_result_table(result: CodeComplexityResult) -> str:
    """
    Format result as ASCII table.
    
    Args:
        result: Analysis result
        
    Returns:
        Formatted table string
    """
    # Header
    width = 60
    lines = [
        "╔" + "═" * width + "╗",
        "║" + " CODE COMPLEXITY ANALYSIS ".center(width) + "║",
        "╠" + "═" * width + "╣",
    ]
    
    # Main info
    lines.append("║" + f" Language: {result.language}".ljust(width) + "║")
    lines.append("║" + f" Time Complexity: {result.overall_time_complexity}".ljust(width) + "║")
    lines.append("║" + f" Space Complexity: {result.overall_space_complexity}".ljust(width) + "║")
    lines.append("║" + f" Confidence: {result.confidence_score:.0%}".ljust(width) + "║")
    lines.append("╠" + "═" * width + "╣")
    
    # Summary
    lines.append("║" + " Summary:".ljust(width) + "║")
    for line in _wrap_text(result.summary, width - 2):
        lines.append("║" + f" {line}".ljust(width) + "║")
    
    # Functions
    if result.functions:
        lines.append("╠" + "═" * width + "╣")
        lines.append("║" + " Functions:".ljust(width) + "║")
        for func in result.functions:
            func_line = f"  • {func.name}: Time={func.time_complexity}, Space={func.space_complexity}"
            lines.append("║" + func_line.ljust(width) + "║")
    
    # Suggestions
    if result.optimization_suggestions:
        lines.append("╠" + "═" * width + "╣")
        lines.append("║" + " Optimization Suggestions:".ljust(width) + "║")
        for i, suggestion in enumerate(result.optimization_suggestions, 1):
            for line in _wrap_text(f"{i}. {suggestion}", width - 2):
                lines.append("║" + f" {line}".ljust(width) + "║")
    
    # Footer
    lines.append("╚" + "═" * width + "╝")
    
    return "\n".join(lines)


def format_result_markdown(result: CodeComplexityResult) -> str:
    """
    Format result as Markdown.
    
    Args:
        result: Analysis result
        
    Returns:
        Formatted Markdown string
    """
    lines = [
        "# Code Complexity Analysis",
        "",
        "## Overview",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| **Language** | {result.language} |",
        f"| **Time Complexity** | `{result.overall_time_complexity}` |",
        f"| **Space Complexity** | `{result.overall_space_complexity}` |",
        f"| **Confidence** | {result.confidence_score:.0%} |",
        "",
        "## Summary",
        "",
        result.summary,
        "",
    ]
    
    if result.detailed_explanation:
        lines.extend([
            "## Detailed Analysis",
            "",
            result.detailed_explanation,
            "",
        ])
    
    if result.functions:
        lines.extend([
            "## Function Analysis",
            "",
            "| Function | Time | Space |",
            "|----------|------|-------|",
        ])
        for func in result.functions:
            lines.append(f"| `{func.name}` | `{func.time_complexity}` | `{func.space_complexity}` |")
        lines.append("")
        
        # Detailed function explanations
        for func in result.functions:
            if func.explanation:
                lines.extend([
                    f"### `{func.name}`",
                    "",
                    func.explanation,
                    "",
                ])
                if func.variables:
                    lines.append("**Variables:**")
                    for var, desc in func.variables.items():
                        lines.append(f"- `{var}`: {desc}")
                    lines.append("")
    
    if result.optimization_suggestions:
        lines.extend([
            "## Optimization Suggestions",
            "",
        ])
        for i, suggestion in enumerate(result.optimization_suggestions, 1):
            lines.append(f"{i}. {suggestion}")
        lines.append("")
    
    return "\n".join(lines)


def format_result_rich(result: CodeComplexityResult):
    """
    Format result for Rich console output.
    
    Returns Rich renderable objects for beautiful terminal output.
    """
    try:
        from rich.panel import Panel
        from rich.table import Table
        from rich.text import Text
        from rich.console import Group
        from rich.markdown import Markdown
    except ImportError:
        # Fallback to table format if Rich not installed
        return format_result_table(result)
    
    # Build components
    components = []
    
    # Main info table
    info_table = Table(show_header=False, box=None, padding=(0, 2))
    info_table.add_column("Label", style="bold cyan")
    info_table.add_column("Value")
    
    info_table.add_row("Language", result.language)
    info_table.add_row("Time Complexity", Text(result.overall_time_complexity, style="bold green"))
    info_table.add_row("Space Complexity", Text(result.overall_space_complexity, style="bold yellow"))
    info_table.add_row("Confidence", f"{result.confidence_score:.0%}")
    
    components.append(info_table)
    components.append(Text())
    components.append(Text("Summary", style="bold underline"))
    components.append(Text(result.summary))
    
    # Functions table
    if result.functions:
        components.append(Text())
        components.append(Text("Functions", style="bold underline"))
        
        func_table = Table(show_header=True)
        func_table.add_column("Function", style="cyan")
        func_table.add_column("Time", style="green")
        func_table.add_column("Space", style="yellow")
        
        for func in result.functions:
            func_table.add_row(func.name, func.time_complexity, func.space_complexity)
        
        components.append(func_table)
    
    # Suggestions
    if result.optimization_suggestions:
        components.append(Text())
        components.append(Text("Optimization Suggestions", style="bold underline"))
        for i, suggestion in enumerate(result.optimization_suggestions, 1):
            components.append(Text(f"  {i}. {suggestion}"))
    
    # Wrap in panel
    return Panel(
        Group(*components),
        title="[bold]Code Complexity Analysis[/bold]",
        border_style="blue",
    )


def _wrap_text(text: str, width: int) -> list[str]:
    """Wrap text to specified width."""
    words = text.split()
    lines = []
    current_line = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 <= width:
            current_line.append(word)
            current_length += len(word) + 1
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
            current_length = len(word)
    
    if current_line:
        lines.append(" ".join(current_line))
    
    return lines or [""]
