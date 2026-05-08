# Contributing

Thanks for your interest in contributing to `@centoic/ipeds-download`.

## Getting Started

```bash
git clone https://github.com/centoic/ipeds-download.git
cd ipeds-download
npm install
```

### Prerequisites

- Node.js >= 20
- Playwright browsers: `npx playwright install chromium`

### Verify Your Setup

```bash
npm run typecheck
npm run lint
npm run build
```

## Project Structure

```
src/
├── cli/           CLI-specific code (entry point, argument parsing, console output)
├── lib/           Core library code (scraping, downloading, pattern matching, types)
└── index.ts       Public API exports
```

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `npm run build`     | Compile TypeScript to `dist/` |
| `npm run typecheck` | Type check without emitting   |
| `npm run lint`      | Run ESLint                    |

## Before Submitting

- Ensure `npm run typecheck` passes
- Ensure `npm run lint` passes
- Keep changes focused and minimal
- Follow existing code style (4-space indent, arrow functions, explicit types)

## How It Works

The IPEDS Data Center uses ASP.NET WebForms with no public REST API. The tool uses Playwright to automate a headless browser that navigates the IPEDS site, selects years via dropdowns, submits ASP.NET postbacks, and scrapes the resulting HTML tables for file listings and download URLs.

## Questions

Open an issue on GitHub.
