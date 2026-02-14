export const VERSION = '3.0';
export const APP_NAME = 'Codalyzer';

export const SUPPORTED_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript', ext: ['.js', '.jsx'] },
  { label: 'TypeScript', value: 'typescript', ext: ['.ts', '.tsx'] },
  { label: 'Python', value: 'python', ext: ['.py'] },
  { label: 'C++', value: 'cpp', ext: ['.cpp', '.cc', '.cxx'] },
  { label: 'C', value: 'c', ext: ['.c', '.h'] },
  { label: 'Java', value: 'java', ext: ['.java'] },
  { label: 'Go', value: 'go', ext: ['.go'] },
  { label: 'Rust', value: 'rust', ext: ['.rs'] },
  { label: 'Ruby', value: 'ruby', ext: ['.rb'] },
  { label: 'PHP', value: 'php', ext: ['.php'] },
] as const;

export const ACCEPTED_FILE_EXTENSIONS = SUPPORTED_LANGUAGES.flatMap(l => l.ext).join(',');

// Prism language map
export const PRISM_LANGUAGE_MAP: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  'C++': 'cpp',
  C: 'c',
  Java: 'java',
  Go: 'go',
  Rust: 'rust',
  Ruby: 'ruby',
  PHP: 'php',
};

// File extension to language map
export const EXT_TO_LANGUAGE: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  py: 'Python',
  cpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  c: 'C',
  h: 'C',
  java: 'Java',
  go: 'Go',
  rs: 'Rust',
  rb: 'Ruby',
  php: 'PHP',
};
