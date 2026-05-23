import { GoogleGenAI, Type } from '@google/genai';
import { config } from './config';

const SYSTEM_INSTRUCTION = `You are Codalyzer, an expert code complexity analyzer. Provide strictly structured outputs.
- Statically analyze the code algorithms as well as semantic and logical flows to detect complexities and issues.
- Rate complexity relative to the algorithm being implemented. Example: O(n²) is "Good" for Bubble Sort (optimal) but "Poor" for Merge Sort.
- Use Big-O notation for time (best, average, worst) and space.
- For each issue, return the exact problematic code snippet instead of line numbers.
- Set fix_type to "code" when you supply code snippet changes; otherwise use "no-code" if you supply text based fixes. The fix field is always required (code or no-code).
- Provide only a concise code summary—no extra commentary.
`;

const ComplexityMetricSchema = {
  type: Type.OBJECT,
  properties: {
    notation: { type: Type.STRING },
    description: { type: Type.STRING },
    rating: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor'] },
  },
  required: ['notation', 'description', 'rating'],
} as const;

const ResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    fileName: { type: Type.STRING },
    language: { type: Type.STRING },
    timeComplexity: {
      type: Type.OBJECT,
      properties: {
        best: ComplexityMetricSchema,
        average: ComplexityMetricSchema,
        worst: ComplexityMetricSchema,
      },
      required: ['best', 'average', 'worst'],
    },
    spaceComplexity: ComplexityMetricSchema,
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Optimization', 'Bug', 'Critical', 'Security', 'Style'] },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          code_snippet: { type: Type.STRING },
          fix_type: { type: Type.STRING, enum: ['code', 'no-code'] },
          fix: { type: Type.STRING },
        },
        required: ['id', 'type', 'title', 'description', 'code_snippet', 'fix_type', 'fix'],
      },
    },
  },
  required: ['summary', 'fileName', 'language', 'timeComplexity', 'spaceComplexity', 'issues'],
} as const;

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!config.GEMINI_API_KEY) return null;
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }
  return _client;
}

export function isAvailable(): boolean {
  return !!config.GEMINI_API_KEY;
}

export interface AnalysisData {
  summary: string;
  fileName: string;
  language: string;
  timeComplexity: {
    best: { notation: string; description: string; rating: string };
    average: { notation: string; description: string; rating: string };
    worst: { notation: string; description: string; rating: string };
  };
  spaceComplexity: { notation: string; description: string; rating: string };
  issues: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    code_snippet: string;
    fix_type: string;
    fix: string;
  }>;
  sourceCode?: string;
  timestamp?: string;
}

function formatTimestamp(): string {
  const d = new Date();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${month} ${day}, ${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export async function analyze(code: string, filename: string, language: string): Promise<AnalysisData> {
  const client = getClient();
  if (!client) throw new Error('Gemini client not initialized — check GEMINI_API_KEY');

  const prompt =
    `Analyze the following code for complexity:\n\n` +
    `Filename: ${filename}\n` +
    `Language: ${language === 'auto' ? 'Auto-detect' : language}\n\n` +
    `\`\`\`\n${code}\n\`\`\`\n\n` +
    `Follow the provided schema exactly, include fix_type and code_snippet (problematic code), and rate complexity relative to the algorithm implemented.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.GEMINI_TIMEOUT_MS);

  let response;
  try {
    response = await client.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: config.TEMPERATURE,
        maxOutputTokens: config.MAX_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: ResponseSchema,
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as never,
            threshold: 'BLOCK_MEDIUM_AND_ABOVE' as never,
          },
        ],
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Analysis timed out after ${config.GEMINI_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const text = response.text;
  if (!text) {
    throw new Error('Model returned empty response (possibly safety blocked)');
  }

  let parsed: AnalysisData;
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Model returned invalid JSON structure');
  }

  parsed.sourceCode = code;
  parsed.timestamp = formatTimestamp();

  if (JSON.stringify(parsed).length > config.MAX_ANALYSIS_SIZE) {
    throw new Error(`Analysis response exceeds maximum size of ${config.MAX_ANALYSIS_SIZE} bytes`);
  }

  for (const issue of parsed.issues || []) {
    if (issue.code_snippet && issue.code_snippet.length > config.MAX_CODE_SNIPPET_LENGTH) {
      throw new Error('LLM generated invalid response (snippet too large)');
    }
  }

  return parsed;
}
