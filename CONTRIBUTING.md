# Contributing

Thanks for your interest in contributing to `@centoic/ipeds-fetch`.

## Getting Started

```bash
git clone https://github.com/centoic/ipeds-fetch.git
cd ipeds-fetch
pnpm install
```

### Prerequisites

- Node.js >= 20
- pnpm (install via `npm install -g pnpm`)
- Playwright browsers: `npx playwright install chromium`

### Verify Your Setup

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

## Project Structure

```
src/
├── cli/           CLI-specific code (entry point, argument parsing, console output)
├── lib/           Core library code (scraping, downloading, pattern matching, types)
└── index.ts       Public API exports
```

## Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `pnpm run build`     | Compile TypeScript to `dist/` |
| `pnpm run typecheck` | Type check without emitting   |
| `pnpm run lint`      | Run ESLint                    |

## Before Submitting

- Ensure `pnpm run typecheck` passes
- Ensure `pnpm run lint` passes
- Keep changes focused and minimal
- Follow existing code style (4-space indent, arrow functions, explicit types)

## How It Works

The IPEDS Data Center uses ASP.NET WebForms with no public REST API. The tool uses Playwright to automate a headless browser that navigates the IPEDS site, selects years via dropdowns, submits ASP.NET postbacks, and scrapes the resulting HTML tables for file listings and download URLs.

## Questions

Open an issue on GitHub.
