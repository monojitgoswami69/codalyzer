# Codalyzer

An intelligent code complexity analysis tool powered by Google Gemini AI that provides comprehensive algorithmic complexity insights for multiple programming languages.

## Overview

Codalyzer is a professional development tool designed to help developers understand and optimize their code's performance characteristics. It leverages advanced AI models to analyze source code and provide detailed complexity metrics, performance visualizations, and actionable optimization suggestions.

Recently rewritten into a cohesive **unified full-stack application** powered by Next.js.

### Key Features

- **Multi-language Support**: JavaScript, TypeScript, Python, C++, C, Java, Go, Rust, Ruby, and PHP
- **Comprehensive Analysis**: Best, average, and worst-case time complexity evaluation
- **Space Complexity Assessment**: Memory usage analysis with detailed breakdowns
- **Interactive Visualizations**: Real-time performance curves with math precision using Recharts
- **Code Quality Insights**: Automated detection of optimization opportunities
- **Smart File Management**: Automatic language detection and intelligent file naming
- **Code Sharing**: Ephemeral sharing of code snippets via Upstash Redis
- **Professional Reports**: Export-ready PDF reports with detailed analysis
- **Real-time Processing**: Live syntax highlighting with IDE-like experience

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & PostCSS
- **State Management**: React 19 natively
- **AI Model**: Google GenAI SDK (Gemini)
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Data Store**: Upstash Redis (for saving ephemeral shares & rate limiting)
- **Validation**: Zod for type-safe API boundaries

## Installation

### Prerequisites

- Node.js 18+ and npm
- Google Gemini API key
- (Optional) Upstash Redis credentials for advanced features like Sharing & Rate Limiting

### Setup

1. **Clone & Install**
```bash
git clone <repository_url>
cd codalyzer
npm install
```

2. **Configure Environment**

Copy the example environment into a local override file:
```bash
cp .env.example .env.local
```
Fill out the variables in `.env.local`:
- `API_KEY` (Your Google Gemini Key)
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (For ephemeral storage)

3. **Run Development Server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Configuration

### Environment Variables

| Variable | Required? | Description |
|----------|---------|-------------|
| `API_KEY` | Yes | Google Gemini API key |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis connection URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis secret token |
| `GEMINI_MODEL` | No | Override default Gemini model |

## Usage

1. **Create or Upload Code**: Start with a new snippet or upload existing files
2. **Select Language**: Choose from supported programming languages or use auto-detection
3. **Run Analysis**: Click the "Analyse" button to process your code
4. **Review Results**: Examine complexity metrics, performance charts, and optimization suggestions
5. **Share/Export**: Share snippet persistently or Export PDF reports.

## API Reference (Next.js Edge)

The application provides backend logic natively through Next.js Route Handlers (`app/api/v1/`).

- **`POST /api/v1/analyze`** - Analyze code complexity and return detailed metrics. Expected payload: `{ code, filename, language }`
- **`GET /api/v1/health`** - Check API health and model availability.
- **`GET /api/v1/initialize`** - Fetches initial environment variables/configurations available to UI.
- **`POST /api/v1/share`** - Create a short-lived shareable code snippet link (requires Redis).
- **`GET /api/v1/share/[id]`** - Retrieve a shared code snippet.

## Development & Build Process

**Production Build:**
```bash
npm run build
```

**Starting Production Server:**
```bash
npm run start
```

## Contributing

We welcome contributions to improve Codalyzer. Please ensure all submissions follow these guidelines:

1. Maintain professional code style without decorative elements
2. Include comprehensive documentation for new features
3. Ensure backward compatibility with existing APIs
4. Add appropriate error handling and validation
5. Follow the established TypeScript conventions

## License

This project is available under the MIT License. See LICENSE file for details.
