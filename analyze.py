#!/usr/bin/env python3
"""
Code Complexity Analyzer - CLI

A modern tool to analyze time and space complexity of code in any language.

Usage:
    python analyze.py <file_or_code>
    python analyze.py --file example.py
    python analyze.py --code "def foo(n): return [i*2 for i in range(n)]"
    python analyze.py --interactive
    
Examples:
    python analyze.py solution.py
    python analyze.py --code "for i in range(n): for j in range(n): print(i,j)"
    python analyze.py --file sort.cpp --output json
    python analyze.py --compare file1.py file2.py
"""

import sys
import os
import asyncio
import argparse
from pathlib import Path
from typing import Optional

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent))

# Check for required packages
def check_dependencies():
    """Check and report missing dependencies."""
    missing = []
    
    try:
        import pydantic
    except ImportError:
        missing.append("pydantic")
    
    try:
        import httpx
    except ImportError:
        missing.append("httpx")
    
    try:
        import tenacity
    except ImportError:
        missing.append("tenacity")
    
    if missing:
        print(f"❌ Missing required packages: {', '.join(missing)}")
        print(f"   Install with: pip install {' '.join(missing)}")
        sys.exit(1)

check_dependencies()

# Try to import Rich for beautiful output
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.syntax import Syntax
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.markdown import Markdown
    from rich.prompt import Prompt
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    console = None

from core import CodeComplexityAnalyzer, AnalysisOptions, CodeComplexityResult
from utils.formatters import format_result_table, format_result_json, format_result_markdown
from utils.file_utils import read_code_file, detect_language


def print_banner():
    """Print application banner."""
    if RICH_AVAILABLE:
        banner = """
╔═══════════════════════════════════════════════════════════╗
║           🔍 CODE COMPLEXITY ANALYZER                     ║
║                                                           ║
║     Analyze time & space complexity of any code           ║
║              Powered by Groq LLM                          ║
╚═══════════════════════════════════════════════════════════╝
        """
        console.print(Panel(banner.strip(), style="bold blue"))
    else:
        print("\n=== Code Complexity Analyzer ===\n")


def print_error(message: str):
    """Print error message."""
    if RICH_AVAILABLE:
        console.print(f"[bold red]❌ Error:[/bold red] {message}")
    else:
        print(f"❌ Error: {message}")


def print_success(message: str):
    """Print success message."""
    if RICH_AVAILABLE:
        console.print(f"[bold green]✓[/bold green] {message}")
    else:
        print(f"✓ {message}")


def print_warning(message: str):
    """Print warning message."""
    if RICH_AVAILABLE:
        console.print(f"[bold yellow]⚠[/bold yellow] {message}")
    else:
        print(f"⚠ {message}")


def print_info(message: str):
    """Print info message."""
    if RICH_AVAILABLE:
        console.print(f"[bold cyan]ℹ[/bold cyan] {message}")
    else:
        print(f"ℹ {message}")


def display_result(result: CodeComplexityResult, output_format: str = "rich"):
    """Display analysis result in specified format."""
    if output_format == "json":
        print(format_result_json(result))
    elif output_format == "markdown":
        print(format_result_markdown(result))
    elif output_format == "table":
        print(format_result_table(result))
    elif output_format == "rich" and RICH_AVAILABLE:
        display_result_rich(result)
    else:
        print(format_result_table(result))


def display_result_rich(result: CodeComplexityResult):
    """Display result with Rich formatting."""
    if not RICH_AVAILABLE:
        print(format_result_table(result))
        return
    
    # Header panel
    header = Table(show_header=False, box=None, padding=(0, 2))
    header.add_column("Metric", style="bold")
    header.add_column("Value")
    
    header.add_row("📝 Language", f"[cyan]{result.language}[/cyan]")
    header.add_row("⏱️  Time Complexity", f"[bold green]{result.overall_time_complexity}[/bold green]")
    header.add_row("💾 Space Complexity", f"[bold yellow]{result.overall_space_complexity}[/bold yellow]")
    header.add_row("🎯 Confidence", f"[magenta]{result.confidence_score:.0%}[/magenta]")
    
    console.print(Panel(header, title="[bold blue]Analysis Results[/bold blue]", border_style="blue"))
    
    # Summary
    console.print()
    console.print(Panel(result.summary, title="[bold]Summary[/bold]", border_style="green"))
    
    # Detailed explanation (collapsed by default in interactive mode)
    if result.detailed_explanation:
        console.print()
        console.print("[bold]Detailed Analysis:[/bold]")
        console.print(Markdown(result.detailed_explanation))
    
    # Functions table
    if result.functions:
        console.print()
        func_table = Table(title="Function Analysis", show_header=True, header_style="bold magenta")
        func_table.add_column("Function", style="cyan")
        func_table.add_column("Time", style="green", justify="center")
        func_table.add_column("Space", style="yellow", justify="center")
        func_table.add_column("Lines", style="dim")
        
        for func in result.functions:
            lines = f"{func.line_start}-{func.line_end}" if func.line_start else "-"
            func_table.add_row(func.name, func.time_complexity, func.space_complexity, lines)
        
        console.print(func_table)
        
        # Function explanations
        for func in result.functions:
            if func.explanation:
                console.print()
                console.print(Panel(
                    func.explanation,
                    title=f"[cyan]{func.name}[/cyan]",
                    border_style="dim",
                ))
    
    # Optimization suggestions
    if result.optimization_suggestions:
        console.print()
        suggestions_text = "\n".join(f"[yellow]{i}.[/yellow] {s}" for i, s in enumerate(result.optimization_suggestions, 1))
        console.print(Panel(suggestions_text, title="[bold]💡 Optimization Suggestions[/bold]", border_style="yellow"))


async def analyze_code(
    code: str,
    options: AnalysisOptions,
    quick: bool = False,
) -> Optional[CodeComplexityResult]:
    """Analyze code and return result."""
    async with CodeComplexityAnalyzer() as analyzer:
        if quick:
            return await analyzer.analyze_quick(code)
        return await analyzer.analyze(code, options)


async def analyze_file(
    file_path: Path,
    options: AnalysisOptions,
    quick: bool = False,
) -> Optional[CodeComplexityResult]:
    """Analyze file and return result."""
    async with CodeComplexityAnalyzer() as analyzer:
        if quick:
            code = read_code_file(file_path)
            return await analyzer.analyze_quick(code)
        return await analyzer.analyze_file(file_path, options)


async def compare_files(file1: Path, file2: Path) -> dict:
    """Compare complexity of two files."""
    code1 = read_code_file(file1)
    code2 = read_code_file(file2)
    
    async with CodeComplexityAnalyzer() as analyzer:
        return await analyzer.compare(code1, code2)


def run_interactive_mode():
    """Run interactive analysis mode."""
    print_banner()
    print_info("Interactive mode - Enter code snippets for analysis")
    print_info("Type 'exit' or 'quit' to exit, 'help' for commands\n")
    
    options = AnalysisOptions()
    
    while True:
        try:
            if RICH_AVAILABLE:
                console.print("[bold cyan]Enter code[/bold cyan] (or paste multi-line, then empty line to analyze):")
            else:
                print("Enter code (empty line to analyze):")
            
            lines = []
            while True:
                try:
                    line = input()
                    if line.strip().lower() in ('exit', 'quit'):
                        print_success("Goodbye!")
                        return
                    if line.strip().lower() == 'help':
                        print_help_interactive()
                        break
                    if line == '' and lines:
                        break
                    lines.append(line)
                except EOFError:
                    break
            
            if not lines:
                continue
            
            code = '\n'.join(lines)
            
            if not code.strip():
                continue
            
            # Show analyzing indicator
            if RICH_AVAILABLE:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    progress.add_task("Analyzing complexity...", total=None)
                    result = asyncio.run(analyze_code(code, options))
            else:
                print("Analyzing...")
                result = asyncio.run(analyze_code(code, options))
            
            if result:
                console.print() if RICH_AVAILABLE else print()
                display_result(result)
                console.print() if RICH_AVAILABLE else print()
        
        except KeyboardInterrupt:
            print_warning("\nInterrupted. Type 'exit' to quit.")
        except Exception as e:
            print_error(str(e))


def print_help_interactive():
    """Print help for interactive mode."""
    help_text = """
Commands:
  exit, quit  - Exit interactive mode
  help        - Show this help message
  
To analyze code:
  1. Paste your code
  2. Press Enter on an empty line to start analysis
  
Tips:
  - You can paste multi-line code
  - Supports any programming language
  - Analysis includes time and space complexity
    """
    if RICH_AVAILABLE:
        console.print(Panel(help_text.strip(), title="Help", border_style="cyan"))
    else:
        print(help_text)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Analyze time and space complexity of code",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s solution.py                    # Analyze a file
  %(prog)s --code "for i in range(n): print(i)"  # Analyze inline code
  %(prog)s --interactive                  # Interactive mode
  %(prog)s sort.cpp --output json         # Output as JSON
  %(prog)s --compare v1.py v2.py          # Compare two implementations
        """,
    )
    
    # Input options
    input_group = parser.add_argument_group("Input")
    input_group.add_argument(
        "file",
        nargs="?",
        help="Source file to analyze",
    )
    input_group.add_argument(
        "-c", "--code",
        help="Code string to analyze directly",
    )
    input_group.add_argument(
        "-i", "--interactive",
        action="store_true",
        help="Run in interactive mode",
    )
    input_group.add_argument(
        "--compare",
        nargs=2,
        metavar=("FILE1", "FILE2"),
        help="Compare complexity of two files",
    )
    
    # Analysis options
    analysis_group = parser.add_argument_group("Analysis Options")
    analysis_group.add_argument(
        "-l", "--language",
        help="Specify programming language (auto-detected by default)",
    )
    analysis_group.add_argument(
        "-q", "--quick",
        action="store_true",
        help="Quick analysis (faster, less detailed)",
    )
    analysis_group.add_argument(
        "--no-functions",
        action="store_true",
        help="Skip individual function analysis",
    )
    analysis_group.add_argument(
        "--no-suggestions",
        action="store_true",
        help="Skip optimization suggestions",
    )
    analysis_group.add_argument(
        "--best-worst",
        action="store_true",
        help="Include best/worst/average case analysis",
    )
    
    # Output options
    output_group = parser.add_argument_group("Output Options")
    output_group.add_argument(
        "-o", "--output",
        choices=["rich", "table", "json", "markdown"],
        default="rich",
        help="Output format (default: rich)",
    )
    output_group.add_argument(
        "-f", "--output-file",
        help="Write output to file",
    )
    output_group.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output with more details",
    )
    
    # Other options
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 1.0.0",
    )
    
    args = parser.parse_args()
    
    # Check for GROQ_API_KEY
    if not os.getenv("GROQ_API_KEY"):
        print_error("GROQ_API_KEY environment variable not set!")
        print_info("Get your free API key from: https://console.groq.com")
        print_info("Then set it: export GROQ_API_KEY='your-key-here'")
        sys.exit(1)
    
    # Build analysis options
    options = AnalysisOptions(
        analyze_functions=not args.no_functions,
        include_suggestions=not args.no_suggestions,
        detailed_mode=args.verbose or not args.quick,
        language_hint=args.language,
        include_best_worst_case=args.best_worst,
    )
    
    # Handle different modes
    try:
        # Interactive mode
        if args.interactive:
            run_interactive_mode()
            return
        
        # Compare mode
        if args.compare:
            file1, file2 = args.compare
            path1, path2 = Path(file1), Path(file2)
            
            if not path1.exists():
                print_error(f"File not found: {file1}")
                sys.exit(1)
            if not path2.exists():
                print_error(f"File not found: {file2}")
                sys.exit(1)
            
            print_info(f"Comparing {file1} vs {file2}...")
            
            result = asyncio.run(compare_files(path1, path2))
            
            if args.output == "json":
                import json
                print(json.dumps(result, indent=2))
            else:
                display_comparison_result(result, file1, file2)
            return
        
        # Direct code analysis
        if args.code:
            if RICH_AVAILABLE and args.output == "rich":
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    progress.add_task("Analyzing complexity...", total=None)
                    result = asyncio.run(analyze_code(args.code, options, args.quick))
            else:
                result = asyncio.run(analyze_code(args.code, options, args.quick))
            
            if result:
                output = get_formatted_output(result, args.output)
                if args.output_file:
                    Path(args.output_file).write_text(output)
                    print_success(f"Output written to {args.output_file}")
                else:
                    display_result(result, args.output)
            return
        
        # File analysis
        if args.file:
            file_path = Path(args.file)
            
            if not file_path.exists():
                print_error(f"File not found: {args.file}")
                sys.exit(1)
            
            print_info(f"Analyzing: {file_path.name}")
            
            if RICH_AVAILABLE and args.output == "rich":
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console,
                ) as progress:
                    progress.add_task("Analyzing complexity...", total=None)
                    result = asyncio.run(analyze_file(file_path, options, args.quick))
            else:
                result = asyncio.run(analyze_file(file_path, options, args.quick))
            
            if result:
                output = get_formatted_output(result, args.output)
                if args.output_file:
                    Path(args.output_file).write_text(output)
                    print_success(f"Output written to {args.output_file}")
                else:
                    console.print() if RICH_AVAILABLE else print()
                    display_result(result, args.output)
            return
        
        # No input provided - show help or start interactive
        print_banner()
        print_info("No input provided. Starting interactive mode...")
        print_info("Use --help to see all options\n")
        run_interactive_mode()
    
    except KeyboardInterrupt:
        print_warning("\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(str(e))
        if args.verbose if hasattr(args, 'verbose') else False:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def get_formatted_output(result: CodeComplexityResult, format: str) -> str:
    """Get formatted output string."""
    if format == "json":
        return format_result_json(result)
    elif format == "markdown":
        return format_result_markdown(result)
    else:
        return format_result_table(result)


def display_comparison_result(result: dict, file1: str, file2: str):
    """Display comparison result."""
    if RICH_AVAILABLE:
        table = Table(title="Complexity Comparison", show_header=True, header_style="bold")
        table.add_column("Metric", style="cyan")
        table.add_column(Path(file1).name, style="green")
        table.add_column(Path(file2).name, style="yellow")
        
        code_a = result.get("code_a", {})
        code_b = result.get("code_b", {})
        
        table.add_row("Time Complexity", 
                     code_a.get("time_complexity", "?"),
                     code_b.get("time_complexity", "?"))
        table.add_row("Space Complexity",
                     code_a.get("space_complexity", "?"),
                     code_b.get("space_complexity", "?"))
        
        console.print(table)
        
        if "comparison" in result:
            console.print()
            console.print(Panel(result["comparison"], title="Analysis", border_style="blue"))
        
        if "winner" in result:
            winner = result["winner"]
            winner_file = file1 if winner.upper() == "A" else (file2 if winner.upper() == "B" else "Tie")
            console.print()
            console.print(f"[bold]Winner:[/bold] {winner_file}")
        
        if "recommendation" in result:
            console.print()
            console.print(Panel(result["recommendation"], title="Recommendation", border_style="green"))
    else:
        import json
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
