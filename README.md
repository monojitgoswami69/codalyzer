# 🔍 Code Complexity Analyzer

A modern, advanced Python tool to analyze **time and space complexity** of code in **any programming language** using Groq's blazing-fast LLM inference.

![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **🌍 Multi-language Support** - Analyze code in Python, JavaScript, Java, C++, Go, Rust, and 50+ languages
- **⚡ Lightning Fast** - Powered by Groq's fast LLM inference API
- **📊 Detailed Analysis** - Get Big-O notation for both time and space complexity
- **🔬 Function-level Breakdown** - Individual analysis for each function/method
- **💡 Optimization Suggestions** - Actionable tips to improve your code
- **🎨 Beautiful Output** - Rich terminal formatting with tables and colors
- **📁 Multiple Formats** - Output as JSON, Markdown, or formatted tables
- **🔄 Compare Mode** - Compare complexity of two implementations
- **💻 Interactive Mode** - REPL-style analysis session

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd code-complexity-analyzer
pip install -r requirements.txt
```

### 2. Set Your Groq API Key

Get your free API key from [Groq Console](https://console.groq.com):

```bash
export GROQ_API_KEY='your-api-key-here'
```

### 3. Analyze Code!

```bash
# Analyze a file
python analyze.py solution.py

# Analyze inline code
python analyze.py --code "def fib(n): return fib(n-1) + fib(n-2) if n > 1 else n"

# Interactive mode
python analyze.py --interactive
```

## 📖 Usage

### Command Line Options

```
usage: analyze.py [-h] [file] [-c CODE] [-i] [--compare FILE1 FILE2]
                  [-l LANGUAGE] [-q] [--no-functions] [--no-suggestions]
                  [--best-worst] [-o {rich,table,json,markdown}]
                  [-f OUTPUT_FILE] [-v]

Analyze time and space complexity of code
```

### Examples

```bash
# Analyze a Python file
python analyze.py bubble_sort.py

# Analyze JavaScript with JSON output
python analyze.py --file sort.js --output json

# Quick analysis (faster, less detailed)
python analyze.py merge_sort.cpp --quick

# Compare two implementations
python analyze.py --compare v1_slow.py v2_optimized.py

# Save analysis to markdown file
python analyze.py algorithm.py --output markdown -f analysis.md

# Specify language hint
python analyze.py mystery_code.txt --language python

# Include best/worst case analysis
python analyze.py search.java --best-worst

# Verbose mode with full explanations
python analyze.py complex_algo.rs -v
```

### Interactive Mode

Start an interactive session to analyze multiple code snippets:

```bash
python analyze.py --interactive
```

Then paste code and press Enter twice to analyze.

## 📦 Project Structure

```
code-complexity-analyzer/
├── analyze.py              # Main CLI entry point
├── requirements.txt        # Python dependencies
├── README.md              # This file
├── core/
│   ├── __init__.py
│   ├── models.py          # Pydantic data models
│   ├── analyzer.py        # Core analysis engine
│   └── prompts.py         # LLM prompt templates
├── providers/
│   ├── __init__.py
│   └── groq_provider.py   # Groq API integration
└── utils/
    ├── __init__.py
    ├── file_utils.py      # File handling utilities
    └── formatters.py      # Output formatters
```

## 🔧 Programmatic Usage

Use the analyzer in your own Python code:

```python
import asyncio
from core import CodeComplexityAnalyzer, AnalysisOptions

async def main():
    code = """
    def binary_search(arr, target):
        left, right = 0, len(arr) - 1
        while left <= right:
            mid = (left + right) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
    """
    
    async with CodeComplexityAnalyzer() as analyzer:
        result = await analyzer.analyze(code)
        
        print(f"Time Complexity: {result.overall_time_complexity}")
        print(f"Space Complexity: {result.overall_space_complexity}")
        print(f"Summary: {result.summary}")

asyncio.run(main())
```

### Synchronous API

```python
from core import CodeComplexityAnalyzer

analyzer = CodeComplexityAnalyzer()
result = analyzer.analyze_sync("for i in range(n): print(i)")
print(result.overall_time_complexity)  # O(n)
```

### Analysis Options

```python
from core import AnalysisOptions

options = AnalysisOptions(
    analyze_functions=True,       # Analyze each function separately
    include_suggestions=True,     # Include optimization tips
    detailed_mode=True,           # Detailed explanations
    language_hint="Python",       # Specify language
    include_best_worst_case=True, # Include best/worst/avg case
)

result = await analyzer.analyze(code, options)
```

## 📊 Output Formats

### Rich (Default)
Beautiful terminal output with colors, tables, and formatting.

### JSON
```json
{
  "language": "Python",
  "overall_time_complexity": "O(n²)",
  "overall_space_complexity": "O(1)",
  "summary": "Nested loops result in quadratic time complexity",
  "functions": [...],
  "optimization_suggestions": [...]
}
```

### Markdown
Formatted markdown suitable for documentation.

### Table
ASCII table format for plain terminals.

## 🧠 How It Works

1. **Code Input** - Accept code from file, string, or interactive input
2. **Language Detection** - Auto-detect programming language from extension or content
3. **Prompt Engineering** - Build carefully crafted prompts for accurate analysis
4. **LLM Analysis** - Send to Groq's fast inference API (llama-3.3-70b)
5. **Result Parsing** - Parse structured JSON response into typed models
6. **Caching** - Cache results to avoid redundant API calls
7. **Formatting** - Display results in chosen format

## 🎯 Complexity Classes

The analyzer recognizes these complexity classes:

| Notation | Name | Example |
|----------|------|---------|
| O(1) | Constant | Hash table lookup |
| O(log n) | Logarithmic | Binary search |
| O(n) | Linear | Linear search |
| O(n log n) | Linearithmic | Merge sort |
| O(n²) | Quadratic | Bubble sort |
| O(n³) | Cubic | Matrix multiplication |
| O(2ⁿ) | Exponential | Recursive fibonacci |
| O(n!) | Factorial | Permutations |

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Your Groq API key | Yes |

### Groq Models

The analyzer uses these models (with automatic fallback):

- **Primary**: `llama-3.3-70b-versatile` - Best reasoning capability
- **Fallback**: `llama-3.1-8b-instant` - Faster, for rate limit recovery

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - feel free to use in your own projects!

## 🙏 Acknowledgments

- [Groq](https://groq.com) for blazing-fast LLM inference
- [Rich](https://github.com/Textualize/rich) for beautiful terminal formatting
- [Pydantic](https://pydantic.dev) for data validation

---

Made with ❤️ for developers who care about algorithmic efficiency