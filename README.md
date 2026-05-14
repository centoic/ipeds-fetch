<p align="center">
  <img src="assets/ipeds-fetch-logo.png" width="220" alt="IPEDS Fetch mascot — a seated cartoon dog">
</p>

# @centoic/ipeds-fetch

A command-line tool and TypeScript library for downloading data files and data dictionaries from the [IPEDS](https://nces.ed.gov/ipeds/) (Integrated Postsecondary Education Data System) Complete Data Files repository maintained by NCES.

## Prerequisites

- **Node.js >= 20**
- **Playwright browsers**: This tool uses Playwright to interact with the IPEDS ASP.NET WebForms site. Install the Chromium browser before first use:

  ```bash
  npx playwright install chromium
  ```

## Quick Start

```bash
npx @centoic/ipeds-fetch --years 2024 --tables "IC*" --list
```

## Installation

### Global install

```bash
npm install -g @centoic/ipeds-fetch
ipeds-fetch --years 2024 --tables HD2024 --output ./data
```

### Local install

```bash
npm install @centoic/ipeds-fetch
```

## CLI Usage

```
ipeds-fetch --years <spec> --tables <patterns> [options]
```

### Required Options

| Option | Description |
|--------|-------------|
| `--years <spec>` | Year specification (see below) |
| `--tables <patterns>` | Table name pattern(s), comma-separated (see below) |

### Optional Options

| Option | Description |
|--------|-------------|
| `--list[:format]` | List matching tables instead of downloading. Formats: `text` (default), `json`, `tsv` |
| `--with-dictionaries` | Also download data dictionaries (.xlsx/.xls) for each table |
| `--output <dir>` | Output directory (default: current working directory) |
| `--delay <ms>` | Delay in milliseconds between consecutive downloads (default: 0) |
| `--help` | Display help information |
| `--version` | Display version number |

### Year Specification

| Format | Example | Interpretation |
|--------|---------|----------------|
| Single year | `2024` | Just year 2024 |
| Comma-separated | `2020,2022,2024` | Years 2020, 2022, and 2024 |
| Range (inclusive) | `2020-2024` | Years 2020 through 2024 |
| Mixed | `2010,2015-2017,2020` | 2010, 2015, 2016, 2017, 2020 |
| All years | `all` | All available years (1980-present) |

### Table Patterns

Patterns use glob-style matching with `*` as the wildcard (case-insensitive).

| Pattern | Example | Matches |
|---------|---------|---------|
| Exact name | `HD2024` | Only `HD2024` |
| Wildcard suffix | `IC*` | `IC2024`, `IC2024_AY`, etc. |
| Wildcard prefix | `*_DIST` | `EF2024A_DIST`, `EFFY2024_DIST`, etc. |
| Wildcard both | `*2024*` | Any table containing "2024" |
| All tables | `*` | All tables for the selected year(s) |
| Multiple patterns | `HD*,IC*,ADM*` | Union of all matches |

### Examples

```bash
# List all institutional characteristics tables for 2024 (human-readable)
ipeds-fetch --years 2024 --tables "IC*" --list

# List all tables for 2010 in JSON format
ipeds-fetch --years 2010 --tables "*" --list:json

# Download HD2024 with its data dictionary
ipeds-fetch --years 2024 --tables HD2024 --with-dictionaries

# Download all enrollment tables for 2020-2024 with 500ms delay between downloads
ipeds-fetch --years 2020-2024 --tables "EF*" --delay 500 --output ./enrollment-data

# Download specific tables across multiple years
ipeds-fetch --years 2018-2022 --tables "HD*,IC*" --with-dictionaries

# Download everything for a single year
ipeds-fetch --years 2024 --tables "*" --output ./ipeds-2024
```

## Library API

```ts
import {
    fetchTablesForYears,
    filterTablesByPatterns,
    parseTablePatterns,
    downloadTables,
    downloadZipAndExtract,
    parseYearSpec,
} from "@centoic/ipeds-fetch";
```

### `fetchTablesForYears(years: number[]): Promise<TableMetadata[]>`

Scrapes the IPEDS Data Files page for the given years and returns a list of available tables.

```ts
const tables = await fetchTablesForYears([2024]);
```

### `parseYearSpec(spec: string): { years: number[]; warnings: string[] }`

Parses a year specification string into an array of years.

```ts
const { years, warnings } = parseYearSpec("2020-2024,2018");
// years = [2018, 2020, 2021, 2022, 2023, 2024]
```

### `parseTablePatterns(spec: string): string[]`

Splits a comma-separated pattern string into individual patterns.

```ts
const patterns = parseTablePatterns("HD*,IC*");
// patterns = ["HD*", "IC*"]
```

### `filterTablesByPatterns(tables: TableMetadata[], patterns: string[]): TableMetadata[]`

Filters a list of tables by glob patterns (case-insensitive, `*` wildcard).

```ts
const filtered = filterTablesByPatterns(tables, ["HD2024", "IC*"]);
```

### `downloadTables(options: DownloadTablesOptions): Promise<number>`

Downloads data files (and optionally dictionaries) for a list of tables. Returns the total number of files saved.

```ts
const fileCount = await downloadTables({
    tables: filtered,
    outputDir: "./data",
    withDictionaries: true,
    delayMs: 500,
    onProgress: (msg) => console.log(msg),
    onWarning: (msg) => console.warn(msg),
    onItemComplete: (table, result) => {
        if (!result.success) {
            console.error(`Failed: ${table.tableName}`);
        }
    },
});
```

### `downloadZipAndExtract(url: string, outputDir: string): Promise<DownloadZipResult>`

Downloads a single zip file and extracts its contents to the output directory.

### Types

```ts
interface TableMetadata {
    year: number;
    survey: string;
    title: string;
    tableName: string;
    dataFileUrl: string;
    dictionaryUrl: string;
}

interface DownloadTablesOptions {
    tables: TableMetadata[];
    outputDir: string;
    withDictionaries?: boolean;
    delayMs?: number;
    onProgress?: (message: string) => void;
    onWarning?: (message: string) => void;
    onItemComplete?: (table: TableMetadata, itemResult: DownloadItemResult) => void;
    onAllComplete?: (totalFiles: number) => void;
}

interface DownloadItemResult {
    type: "data" | "dictionary";
    success: boolean;
    files: ExtractedFile[];
    error?: DownloadErrorInfo;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm run typecheck

# Lint
pnpm run lint

# Build (compiles src/ to dist/)
pnpm run build
```

## How It Works

The IPEDS Data Center uses ASP.NET WebForms with no public API. This tool uses Playwright to automate a headless browser that:

1. Navigates to the IPEDS Data Files page
2. Selects the requested year from the dropdown
3. Scrapes the resulting table listing (survey, title, table name, download URLs)
4. Downloads zip files for matching tables
5. Extracts CSV data files and XLSX/XLS dictionaries

## Disclaimer

This project is not affiliated with, endorsed by, or connected to the National Center for Education Statistics (NCES), the U.S. Department of Education, or any other government entity. All data is sourced from publicly available NCES IPEDS data files.

Nothing in this repository constitutes investment advice, a recommendation, or an offer to buy or sell any security. Centoic is a registered investment adviser in California; however, this tool is provided as general-purpose open source software and is not part of any advisory service.

## License

[MIT](LICENSE)
