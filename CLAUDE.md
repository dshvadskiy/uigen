# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components on the fly, displays them in a live preview, and provides a code editor. The project uses a **virtual file system** (VirtualFileSystem class) - no generated files are written to disk during component generation.

## Development Commands

### Setup
```bash
npm run setup                 # Full setup: install deps + Prisma generate + migrations
npm install                   # Install dependencies only
npx prisma generate          # Generate Prisma client
npx prisma migrate dev       # Run database migrations
```

### Development
```bash
npm run dev                  # Start dev server with Turbopack
npm run dev:daemon          # Start dev server in background, logs to logs.txt
npm run build               # Production build
npm run start               # Start production server
```

### Quality & Testing
```bash
npm run lint                # Run ESLint
npm test                    # Run all Vitest tests
npm test -- [file-pattern]  # Run specific test file
npm test -- --watch         # Run tests in watch mode
```

### Database
```bash
npm run db:reset            # Reset database (force migrate reset)
npx prisma studio           # Open Prisma Studio GUI
```

## Architecture

### Virtual File System Core

The application's centerpiece is `VirtualFileSystem` (src/lib/file-system.ts), which maintains an in-memory file tree:
- **Files never touch disk during generation** - all component code lives in memory
- Persisted to database as JSON in Project.data field for registered users
- Serialized/deserialized for API communication between client/server
- Supports full file operations: create, read, update, delete, rename, with automatic parent directory creation

### AI Tool Integration

The chat API (src/app/api/chat/route.ts) uses Vercel AI SDK with two tools that the AI can call:
- **str_replace_editor** (src/lib/tools/str-replace.ts): File editing via search/replace operations
- **file_manager** (src/lib/tools/file-manager.ts): File/folder operations (rename, delete)

These tools operate directly on the VirtualFileSystem instance, which is:
1. Reconstructed from serialized data on each API request
2. Modified by AI tool calls
3. Serialized back to database on completion

### Component Preview System

The preview system (src/lib/transform/jsx-transformer.ts) transforms virtual files into executable code:
- **Babel transforms JSX/TSX → vanilla JS** in the browser
- **Import map** created with blob URLs pointing to transformed code
- **@/ path alias** resolves to virtual file system root
- Third-party imports resolve to https://esm.sh CDN
- CSS imports collected and injected as `<style>` tags
- Missing imports get placeholder components to prevent crashes
- Syntax errors displayed in preview with file location and error details

### Data Flow

```
User Chat Message
  → API Route (src/app/api/chat/route.ts)
  → Vercel AI SDK streamText with Claude
  → AI uses str_replace_editor/file_manager tools
  → Tools modify VirtualFileSystem
  → Stream response to client
  → Client updates VirtualFileSystem state
  → FileSystemContext notifies components
  → PreviewFrame transforms & renders components
  → Database updated on completion (authenticated users)
```

### Authentication & Persistence

- **JWT-based auth** (src/lib/auth.ts) with bcrypt password hashing
- **Anonymous mode**: Full functionality, no persistence
- **Registered users**: Projects saved to SQLite (Prisma)
- **Middleware** (src/middleware.ts): Routes protection, anonymous work tracking
- **Prisma schema** (prisma/schema.prisma): User, Project models with JSON storage

### State Management

- **FileSystemContext** (src/lib/contexts/file-system-context.tsx): Global VFS state with React Context
- **ChatContext** (src/lib/contexts/chat-context.tsx): Chat messages and AI streaming state
- Both contexts use Vercel AI SDK's `useChat` hook for streaming AI responses

### Key Technical Patterns

1. **VFS Serialization**: FileNode objects with Map children → JSON-serializable format for DB/API
2. **Path Resolution**: Supports absolute (/path), relative (./path), and aliased (@/path) imports
3. **Tool System**: AI model can call tools directly, tools return structured results
4. **Transform Pipeline**: TSX → Babel → ES modules → blob URLs → import map → preview
5. **Error Boundaries**: Both React ErrorBoundary and syntax error display in preview

## Important File Paths

- **Database schema**: `prisma/schema.prisma` - **Always check this file to understand data structure**
- Prisma client generated to: `src/generated/prisma` (not default node_modules)
- Database file: `prisma/dev.db` (SQLite)
- Entry point: `src/app/page.tsx` → `main-content.tsx`
- AI prompt: `src/lib/prompts/generation.tsx` (instructions for AI component generation)
- Virtual FS implementation: `src/lib/file-system.ts`

## Development Notes

- **No ANTHROPIC_API_KEY?** App runs in mock mode with static responses
- **Tests use Vitest** with jsdom environment for React component testing
- **Path aliases**: `@/` maps to `src/` directory (configured in tsconfig.json)
- **Tailwind v4** used (newer PostCSS-based version)
- **React 19** with automatic JSX runtime
- **Next.js 15** with App Router (not Pages Router)

## Code Style

- **Use comments sparingly** - Only comment complex code that isn't self-evident

## Testing Specific Files

```bash
npm test -- file-tree              # Test FileTree component
npm test -- jsx-transformer        # Test JSX transform logic
npm test -- file-system-context    # Test VFS React integration
npm test -- ChatInterface          # Test chat UI
```
