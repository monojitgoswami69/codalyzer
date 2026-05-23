import { EXT_TO_LANGUAGE } from './constants';

interface LanguageProfile {
  keywords: string[];
  builtins: string[];
  patterns: RegExp[];
  keywordWeight: number;
  builtinWeight: number;
  patternWeight: number;
}

const PROFILES: Record<string, LanguageProfile> = {
  Python: {
    keywords: ['def ', 'elif ', 'except:', 'except ', 'lambda ', 'yield ', 'nonlocal ', 'pass\n', 'raise ', 'with ', 'as ', 'finally:'],
    builtins: ['print(', 'range(', 'len(', 'input(', 'isinstance(', 'enumerate(', '__init__', '__name__', 'self.', 'self,', 'True', 'False', 'None'],
    patterns: [
      /^from\s+\S+\s+import\s/m,
      /^import\s+\w+/m,
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+.*:/m,
      /^\s*@\w+/m,
      /:\s*$/m,
      /^\s*if\s+.*:\s*$/m,
      /^\s*for\s+\w+\s+in\s+/m,
    ],
    keywordWeight: 2,
    builtinWeight: 3,
    patternWeight: 4,
  },
  JavaScript: {
    keywords: ['const ', 'let ', 'var ', 'function ', 'async ', 'await ', 'undefined', 'null', '=>', '===', '!=='],
    builtins: ['console.log(', 'console.error(', 'document.', 'window.', 'setTimeout(', 'setInterval(', 'Promise.', 'Array.', 'JSON.parse(', 'JSON.stringify(', 'require(', 'module.exports'],
    patterns: [
      /^(import|export)\s+.*\s+from\s+['"][^'"]+['"]/m,
      /^const\s+\w+\s*=\s*\(.*\)\s*=>/m,
      /^(async\s+)?function\s+\w+\s*\(/m,
      /\bfunction\s*\(/,
      /\bcatch\s*\(\s*\w+\s*\)\s*\{/,
      /\.then\s*\(/,
      /\.forEach\s*\(/,
      /\bnew\s+Promise\s*\(/,
    ],
    keywordWeight: 1.5,
    builtinWeight: 3,
    patternWeight: 3,
  },
  TypeScript: {
    keywords: ['interface ', 'type ', 'enum ', 'readonly ', 'keyof ', 'typeof ', 'as ', 'implements ', 'declare ', 'namespace '],
    builtins: ['string', 'number', 'boolean', 'void', 'never', 'unknown', 'any', 'Record<', 'Partial<', 'Required<', 'Omit<', 'Pick<', 'Promise<'],
    patterns: [
      /:\s*(string|number|boolean|void|any|never|unknown)\b/,
      /\w+\s*:\s*\w+(\[\])?\s*[;,=)]/,
      /^(export\s+)?(interface|type|enum)\s+\w+/m,
      /<[A-Z]\w*>/,
      /\bas\s+\w+/,
      /\w+\?\s*:/,
      /^import\s+type\s/m,
    ],
    keywordWeight: 4,
    builtinWeight: 2,
    patternWeight: 5,
  },
  'C++': {
    keywords: ['#include', 'std::', 'cout', 'cin', 'endl', 'namespace', 'template', 'class ', 'public:', 'private:', 'protected:', 'virtual ', 'nullptr', 'auto ', 'constexpr'],
    builtins: ['vector<', 'string ', 'map<', 'set<', 'pair<', 'unique_ptr<', 'shared_ptr<', 'make_unique<', 'make_shared<', 'begin()', 'end()'],
    patterns: [
      /^#include\s*<\w+>/m,
      /^#include\s*"[^"]+"/m,
      /^using\s+namespace\s+\w+/m,
      /^\s*(class|struct)\s+\w+\s*[\{:]/m,
      /std::\w+/,
      /^\s*template\s*<.*>/m,
      /::\w+\s*\(/,
    ],
    keywordWeight: 4,
    builtinWeight: 3,
    patternWeight: 5,
  },
  C: {
    keywords: ['#include', '#define', 'typedef ', 'struct ', 'sizeof(', 'malloc(', 'free(', 'NULL', 'void ', 'extern ', 'static '],
    builtins: ['printf(', 'scanf(', 'fprintf(', 'sprintf(', 'strlen(', 'strcmp(', 'memcpy(', 'memset(', 'calloc(', 'realloc(', 'fopen(', 'fclose('],
    patterns: [
      /^#include\s*<(stdio|stdlib|string|math|stdbool|stdint|assert|ctype)\.h>/m,
      /^#define\s+\w+/m,
      /^typedef\s+/m,
      /^\s*struct\s+\w+\s*\{/m,
      /\bint\s+main\s*\(/,
      /\b(int|char|float|double|long|short|unsigned)\s+\w+\s*[;=,\[]/,
      /^\s*void\s+\w+\s*\([^)]*\)\s*\{/m,
    ],
    keywordWeight: 2,
    builtinWeight: 4,
    patternWeight: 4,
  },
  Java: {
    keywords: ['public ', 'private ', 'protected ', 'class ', 'extends ', 'implements ', 'interface ', 'abstract ', 'synchronized ', 'throws ', 'final ', 'static '],
    builtins: ['System.out.', 'System.err.', 'String ', 'Integer', 'ArrayList', 'HashMap', 'List<', 'Map<', 'Set<', 'Optional<', '.stream()', 'Collections.', '@Override', '@Autowired'],
    patterns: [
      /^package\s+[\w.]+;/m,
      /^import\s+[\w.]+;/m,
      /^public\s+(class|interface|enum)\s+\w+/m,
      /public\s+static\s+void\s+main\s*\(/,
      /new\s+\w+(<[^>]+>)?\s*\(/,
      /@\w+(\([^)]*\))?$/m,
      /\bthrows\s+\w+/,
    ],
    keywordWeight: 2,
    builtinWeight: 4,
    patternWeight: 5,
  },
  Go: {
    keywords: ['func ', 'package ', 'import ', 'go ', 'chan ', 'defer ', 'goroutine', 'range ', 'select ', 'fallthrough', ':='],
    builtins: ['fmt.', 'log.', 'os.', 'strconv.', 'strings.', 'errors.', 'context.', 'http.', 'make(', 'append(', 'panic(', 'recover('],
    patterns: [
      /^package\s+(main|\w+)\s*$/m,
      /^import\s+\(/m,
      /^func\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\(/m,
      /\w+\s*:=\s*/,
      /\bgo\s+\w+\s*\(/,
      /\bchan\s+\w+/,
      /\bdefer\s+/,
      /\bif\s+\w+\s*:=.*;\s*\w+/,
    ],
    keywordWeight: 4,
    builtinWeight: 3,
    patternWeight: 5,
  },
  Rust: {
    keywords: ['fn ', 'let ', 'mut ', 'pub ', 'impl ', 'trait ', 'enum ', 'match ', 'struct ', 'mod ', 'use ', 'crate', 'unsafe ', 'where '],
    builtins: ['println!', 'format!', 'vec!', 'panic!', 'unwrap()', 'expect(', 'Option<', 'Result<', 'Some(', 'None', 'Ok(', 'Err(', 'String::from', '&str', '&self', 'Box<'],
    patterns: [
      /^use\s+(std|crate|super|self)::/m,
      /^\s*fn\s+\w+\s*(<[^>]+>)?\s*\(/m,
      /^\s*(pub\s+)?(struct|enum|trait|impl)\s+/m,
      /\b(let|let\s+mut)\s+\w+\s*:\s*/,
      /->\s*\w+/,
      /\bmatch\s+\w+\s*\{/,
      /\b\w+!\s*\(/,
      /&(mut\s+)?\w+/,
    ],
    keywordWeight: 4,
    builtinWeight: 4,
    patternWeight: 5,
  },
  Ruby: {
    keywords: ['def ', 'end\n', 'end ', 'puts ', 'require ', 'attr_accessor', 'attr_reader', 'attr_writer', 'class ', 'module ', 'do ', 'elsif ', 'unless ', 'until ', 'rescue ', 'begin ', 'ensure '],
    builtins: ['.each ', '.map ', '.select ', '.reject ', '.reduce ', '.include?', '.nil?', '.empty?', '.to_s', '.to_i', '.to_f', 'puts(', 'gets', 'Kernel.', 'ARGV'],
    patterns: [
      /^require\s+['"][^'"]+['"]/m,
      /^require_relative\s+/m,
      /^\s*def\s+\w+/m,
      /^\s*class\s+\w+\s*(<\s*\w+)?/m,
      /^\s*module\s+\w+/m,
      /\bdo\s*\|[^|]+\|/,
      /\{\s*\|[^|]+\|\s*/,
      /\b(puts|p|pp)\s+/,
    ],
    keywordWeight: 3,
    builtinWeight: 3,
    patternWeight: 4,
  },
  PHP: {
    keywords: ['<?php', '<?=', '$', 'echo ', 'function ', 'public ', 'private ', 'protected ', 'namespace ', 'use ', 'class ', 'abstract ', 'trait '],
    builtins: ['echo ', 'print(', 'var_dump(', 'print_r(', 'isset(', 'empty(', 'array(', 'strlen(', 'str_replace(', 'array_map(', 'array_filter(', 'preg_match(', 'mysqli_', 'PDO'],
    patterns: [
      /^<\?php/m,
      /^\$\w+\s*=/m,
      /^\s*(public|private|protected)\s+(static\s+)?function\s+/m,
      /^\s*function\s+\w+\s*\(/m,
      /^\s*namespace\s+[\w\\]+;/m,
      /^\s*use\s+[\w\\]+;/m,
      /\$this->/,
      /->\w+\s*\(/,
    ],
    keywordWeight: 3,
    builtinWeight: 3,
    patternWeight: 5,
  },
};

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function scoreLanguage(content: string, profile: LanguageProfile): number {
  let score = 0;
  for (const kw of profile.keywords) {
    const count = Math.min(countOccurrences(content, kw), 5);
    score += count * profile.keywordWeight;
  }
  for (const bi of profile.builtins) {
    const count = Math.min(countOccurrences(content, bi), 5);
    score += count * profile.builtinWeight;
  }
  for (const pat of profile.patterns) {
    const matches = content.match(new RegExp(pat.source, pat.flags + (pat.flags.includes('g') ? '' : 'g')));
    const count = Math.min(matches?.length ?? 0, 5);
    score += count * profile.patternWeight;
  }
  return score;
}

function applyDisambiguation(scores: Record<string, number>, content: string): void {
  if (scores['C'] > 0 && scores['C++'] > 0) {
    const hasCppFeatures = /std::|cout|cin|class\s+\w+|template\s*<|namespace\s|::\w+\(|vector<|string\s|nullptr/.test(content);
    if (hasCppFeatures) scores['C'] *= 0.3;
    else scores['C++'] *= 0.5;
  }
  if (scores['JavaScript'] > 0 && scores['TypeScript'] > 0) {
    const hasTsFeatures = /:\s*(string|number|boolean|void|any|never)\b|interface\s+\w+|type\s+\w+\s*=|<[A-Z]\w*>|import\s+type\s/.test(content);
    if (hasTsFeatures) scores['JavaScript'] *= 0.3;
    else scores['TypeScript'] *= 0.4;
  }
  if (scores['C'] > 0 && scores['Java'] > 0) {
    const hasJavaFeatures = /^package\s+[\w.]+;|^import\s+[\w.]+;|System\.out|public\s+static\s+void\s+main/m.test(content);
    if (hasJavaFeatures) scores['C'] *= 0.2;
  }
  if (scores['PHP'] > 0 && /^<\?php/m.test(content)) {
    scores['PHP'] *= 2;
  }
  if (scores['Ruby'] > 0 && scores['Python'] > 0) {
    const hasRubyEnd = /^\s*end\s*$/m.test(content);
    const hasPythonColon = /^\s*(def|class|if|for|while)\s+.*:\s*$/m.test(content);
    if (hasRubyEnd && !hasPythonColon) scores['Python'] *= 0.3;
    else if (hasPythonColon && !hasRubyEnd) scores['Ruby'] *= 0.3;
  }
}

const MIN_CONFIDENCE = 5;

export function detectLanguage(fileName: string, content: string): string {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && EXT_TO_LANGUAGE[ext]) return EXT_TO_LANGUAGE[ext];
  }
  if (!content || content.trim().length < 10) return '';

  const scores: Record<string, number> = {};
  for (const [lang, profile] of Object.entries(PROFILES)) {
    scores[lang] = scoreLanguage(content, profile);
  }
  applyDisambiguation(scores, content);

  let bestLang = '';
  let bestScore = MIN_CONFIDENCE;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  return bestLang;
}
