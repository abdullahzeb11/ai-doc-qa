# AI Document Q&A

Upload a PDF, ask questions in English or Arabic, get answers with source
citations. Built with Next.js 15, Supabase pgvector, and Claude.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS + Shadcn UI primitives, dark mode via `next-themes`
- **DB / Storage**: Supabase Postgres with `pgvector`, Supabase Storage for PDFs
- **LLM**: Anthropic Claude (Haiku by default — one-line swap to Sonnet)
- **Embeddings**: Voyage AI `voyage-3` (1024-dim, multilingual)
- **PDF parsing**: `pdfjs-dist` (server-side, no worker)
- **Deploy**: Netlify

## How it works

```
Upload PDF
   │
   ├─► Supabase Storage (original file)
   │
   ├─► pdfjs-dist parses text per page
   │
   ├─► Recursive chunker (~2000 chars, 200 overlap, sentence-aware)
   │
   ├─► Voyage embeddings (1024-dim, multilingual)
   │
   └─► Insert into chunks table (pgvector)

Ask question
   │
   ├─► Embed query (Voyage, input_type=query)
   │
   ├─► match_chunks RPC (cosine similarity, top-6)
   │
   ├─► Build prompt with <excerpt id=N page=P> tags
   │
   ├─► Claude streams answer (SSE: meta → delta… → done)
   │
   └─► Persist user + assistant messages, citations as JSON
```

## Local setup

### 1. Install

```bash
cd ai-doc-qa
npm install
```

### 2. Provision Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql` (one shot — it's idempotent).
3. Verify `pgvector` is installed:
   ```sql
   select extname from pg_extension where extname = 'vector';
   ```
4. Confirm the `documents` Storage bucket exists (the schema creates it).

### 3. Get API keys

- **Supabase**: Project Settings → API. You need the URL, the `anon` key, and
  the `service_role` key.
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys.
- **Voyage AI**: [voyageai.com](https://www.voyageai.com) → API Keys.

### 4. Configure env

```bash
cp .env.example .env.local
# fill in the values
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF, ask a question.

## Configuration

### Swap Claude model

The default is Haiku (fast + cheap). To use Sonnet for higher-quality answers,
set in `.env.local`:

```bash
ANTHROPIC_MODEL=claude-sonnet-4-6
```

That's the only change — no code changes needed.

### Swap embedding provider

Voyage was chosen because it's Anthropic's recommended embedding partner and
has strong Arabic support. If you'd rather use a different provider:

1. Replace `src/lib/embeddings/voyage.ts` with a module exposing the same
   `embedDocuments(texts: string[])` and `embedQuery(text: string)` signatures.
2. Update the `vector(1024)` dimension in `supabase/schema.sql` to match the
   new model's output dimension, then re-run the schema and re-embed any
   existing documents.
3. Swap the env variables in `.env.example` and `src/lib/env.ts`.

## Deploy to Netlify

1. Push the repo to GitHub.
2. In Netlify, import the repo. The included `netlify.toml` sets the build
   command and Next.js plugin.
3. Add the same env vars from `.env.local` under **Site settings → Environment
   variables**.
4. Deploy. The `@netlify/plugin-nextjs` plugin handles serverless functions
   for the API routes automatically.

> **Note on cold starts**: PDF parsing + embedding can take 5–30s for larger
> documents. The upload endpoint is configured with a 60s timeout, which is
> usually enough for documents under ~50 pages. For larger docs, move the
> processing pipeline to a background worker (e.g. Supabase Edge Functions or
> a queue) and have the upload route just enqueue.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── upload/        POST: parse + chunk + embed + store
│   │   ├── chat/          POST: SSE-stream a grounded answer
│   │   ├── documents/     GET, DELETE
│   │   └── conversations/ GET (list + messages)
│   ├── chat/[documentId]/ Chat UI per document
│   ├── documents/         Upload + list page
│   ├── layout.tsx
│   └── page.tsx           Landing
├── components/
│   ├── ui/                Shadcn primitives
│   ├── upload-dropzone.tsx
│   ├── chat-interface.tsx (streaming)
│   ├── citation-list.tsx
│   ├── document-list.tsx
│   ├── conversation-sidebar.tsx
│   └── theme-{provider,toggle}.tsx
├── lib/
│   ├── anthropic/         Claude client
│   ├── embeddings/        Voyage AI wrapper
│   ├── pdf/               Parse + chunk
│   ├── retrieval/         Vector search
│   ├── supabase/          Browser + admin clients
│   ├── env.ts             Centralized env access
│   └── types.ts
└── supabase/
    └── schema.sql         One-shot setup
```

## Limitations

- **No auth**: this starter has no user accounts. The server uses the Supabase
  service role key for everything. Add auth (Supabase Auth + RLS policies)
  before exposing this publicly.
- **No OCR**: scanned image PDFs won't produce any text. Add a Tesseract or
  cloud OCR step in the upload pipeline if you need it.
- **Synchronous embedding**: the upload route processes the document inline.
  Fine for portfolio scope; move to a background worker for production.
