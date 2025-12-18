"""File handling utilities."""

from pathlib import Path
from typing import Optional


# File extension to language mapping
EXTENSION_MAP = {
    # Common languages
    '.py': 'Python',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.java': 'Java',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.cxx': 'C++',
    '.c': 'C',
    '.h': 'C/C++ Header',
    '.hpp': 'C++ Header',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin Script',
    '.cs': 'C#',
    '.scala': 'Scala',
    '.r': 'R',
    '.R': 'R',
    '.m': 'MATLAB/Objective-C',
    '.mm': 'Objective-C++',
    '.jl': 'Julia',
    '.lua': 'Lua',
    '.pl': 'Perl',
    '.pm': 'Perl Module',
    '.sh': 'Shell/Bash',
    '.bash': 'Bash',
    '.zsh': 'Zsh',
    '.fish': 'Fish',
    '.sql': 'SQL',
    '.psql': 'PostgreSQL',
    '.mysql': 'MySQL',
    # Data/Config
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    # Web
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less',
    # Functional
    '.hs': 'Haskell',
    '.ml': 'OCaml',
    '.mli': 'OCaml Interface',
    '.fs': 'F#',
    '.fsx': 'F# Script',
    '.clj': 'Clojure',
    '.cljs': 'ClojureScript',
    '.ex': 'Elixir',
    '.exs': 'Elixir Script',
    '.erl': 'Erlang',
    '.elm': 'Elm',
    # Systems
    '.asm': 'Assembly',
    '.s': 'Assembly',
    '.v': 'Verilog',
    '.vhd': 'VHDL',
    '.vhdl': 'VHDL',
    # Other
    '.dart': 'Dart',
    '.groovy': 'Groovy',
    '.gradle': 'Gradle',
    '.cmake': 'CMake',
    '.make': 'Makefile',
    '.dockerfile': 'Dockerfile',
    '.tf': 'Terraform',
    '.proto': 'Protocol Buffers',
    '.graphql': 'GraphQL',
    '.gql': 'GraphQL',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.sol': 'Solidity',
    '.move': 'Move',
    '.zig': 'Zig',
    '.nim': 'Nim',
    '.cr': 'Crystal',
    '.d': 'D',
    '.pas': 'Pascal',
    '.pp': 'Pascal',
    '.f90': 'Fortran',
    '.f95': 'Fortran',
    '.f03': 'Fortran',
    '.cob': 'COBOL',
    '.cbl': 'COBOL',
}


def detect_language(file_path: Path) -> Optional[str]:
    """
    Detect programming language from file extension.
    
    Args:
        file_path: Path to file
        
    Returns:
        Language name or None if unknown
    """
    suffix = file_path.suffix.lower()
    
    # Check extension map
    if suffix in EXTENSION_MAP:
        return EXTENSION_MAP[suffix]
    
    # Check filename for special cases
    name = file_path.name.lower()
    
    special_files = {
        'makefile': 'Makefile',
        'dockerfile': 'Dockerfile',
        'gemfile': 'Ruby',
        'rakefile': 'Ruby',
        'vagrantfile': 'Ruby',
        'podfile': 'Ruby',
        'cmakelists.txt': 'CMake',
        'build.gradle': 'Gradle',
        'pom.xml': 'Maven/XML',
        'package.json': 'JSON (npm)',
        'cargo.toml': 'TOML (Rust)',
        'go.mod': 'Go Module',
        'requirements.txt': 'Requirements',
        'setup.py': 'Python',
        'pyproject.toml': 'TOML (Python)',
    }
    
    return special_files.get(name)


def read_code_file(file_path: str | Path) -> str:
    """
    Read source code from file with encoding detection.
    
    Args:
        file_path: Path to source file
        
    Returns:
        File contents as string
        
    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If file can't be read
    """
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")
    
    if not path.is_file():
        raise ValueError(f"Not a file: {path}")
    
    # Try common encodings
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'ascii']
    
    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    
    raise ValueError(f"Could not decode file with common encodings: {path}")


def get_file_info(file_path: str | Path) -> dict:
    """
    Get information about a source file.
    
    Args:
        file_path: Path to source file
        
    Returns:
        Dict with file information
    """
    path = Path(file_path)
    
    if not path.exists():
        return {"error": "File not found"}
    
    stat = path.stat()
    content = read_code_file(path)
    lines = content.splitlines()
    
    # Count non-empty, non-comment lines (basic)
    code_lines = sum(1 for line in lines if line.strip() and not line.strip().startswith(('#', '//', '/*', '*', '--')))
    
    return {
        "path": str(path.absolute()),
        "name": path.name,
        "extension": path.suffix,
        "language": detect_language(path),
        "size_bytes": stat.st_size,
        "total_lines": len(lines),
        "code_lines": code_lines,
        "is_empty": len(content.strip()) == 0,
    }
