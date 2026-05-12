---
name: ipeds-fetch
description: "Download IPEDS (Integrated Postsecondary Education Data System) higher education data files and dictionaries. Use when the user needs postsecondary education data, college/university statistics, enrollment data, financial aid data, graduation rates, institutional characteristics, or any NCES IPEDS data. Triggers on: IPEDS data, education data, college data, university statistics, NCES data, higher education research."
user-invocable: false
---

# IPEDS Data Download

Use `npx @centoic/ipeds-fetch` to discover, list, and download IPEDS postsecondary education datasets for research and analysis. The CLI runs via `npx` — no global install needed (Playwright Chromium must be installed once, see Prerequisites).

---

## Overview

IPEDS is the Integrated Postsecondary Education Data System maintained by the National Center for Education Statistics (NCES). It provides data on U.S. colleges, universities, and technical/vocational institutions.

Common survey categories and their table prefixes:

| Prefix | Survey | What it covers |
|--------|--------|----------------|
| `HD` | Institutional Characteristics | Directory info, institution type, control, locale |
| `IC` | Institutional Characteristics | Educational offerings, tuition, fees, services |
| `EF` | Fall Enrollment | Headcount, race/ethnicity, gender, attendance status |
| `EFFY` | 12-Month Enrollment | Unduplicated enrollment over full academic year |
| `C` | Completions | Degrees and certificates awarded, by level and CIP code |
| `GR` | Graduation Rates | Cohort-based completion rates (4yr, 6yr, 8yr) |
| `ADM` | Admissions | Test scores, applications, admits, enrollees |
| `SFA` | Student Financial Aid | Aid awarded, by type and source |
| `F` | Finance | Revenues, expenses, assets, endowments |
| `HR` | Human Resources | Employees by occupation, salaries, tenure |
| `FLAGS` | Flags | Metadata indicating which surveys an institution completed |

This CLI tool scrapes the IPEDS ASP.NET WebForms site via Playwright browser automation (no public REST API exists) to download CSV data files and XLSX/XLS data dictionaries.

---

## Prerequisites

The CLI runs via `npx` — no global installation required. The only one-time setup is installing the Playwright Chromium browser:

```bash
npx playwright install chromium
```

Requires Node.js >= 20. `npx` will download and cache the package on first use.

---

## CLI Reference

### Syntax

```
npx @centoic/ipeds-fetch --years <spec> --tables <patterns> [options]
```

### Required Options

| Option | Description |
|--------|-------------|
| `--years <spec>` | Year specification — see formats below |
| `--tables <patterns>` | Comma-separated table name patterns (glob `*` wildcard) |

### Optional Options

| Option | Default | Description |
|--------|---------|-------------|
| `--list[:format]` | — | List matching tables instead of downloading. Formats: `text` (default), `json`, `tsv` |
| `--with-dictionaries` | false | Also download data dictionaries (.xlsx/.xls) for each table |
| `--output <dir>` | cwd | Output directory for downloaded files (created if needed) |
| `--delay <ms>` | 0 | Delay in milliseconds between consecutive downloads |
| `--help` | — | Display help information |
| `--version` | — | Display version number |

### Year Specification Formats

| Format | Example | Result |
|--------|---------|--------|
| Single year | `2024` | [2024] |
| Comma-separated | `2020,2022,2024` | [2020, 2022, 2024] |
| Range (inclusive) | `2020-2024` | [2020, 2021, 2022, 2023, 2024] |
| Mixed | `2010,2015-2017,2020` | [2010, 2015, 2016, 2017, 2020] |
| All years | `all` | All available years (approximately 1980–present) |

### Table Pattern Matching

Patterns use glob-style matching with `*` as zero-or-more wildcard. Matching is **case-insensitive**, original table name case is preserved in output.

| Pattern | Matches |
|---------|---------|
| `HD2024` | Only table `HD2024` |
| `IC*` | All Institutional Characteristics tables |
| `*_DIST` | All distribution-variant tables |
| `*2024*` | Any table containing "2024" |
| `*` | All tables |
| `HD*,IC*,ADM*` | Union of all three patterns |

**Important:** Most IPEDS table names include the year. To get enrollment tables for 2024, use `EF*2024*` or `EF2024*` — using just `EF*` matches all years.

---

## Common Workflows

### 1. Discover Available Data

Always use `--list` first to explore what tables exist before downloading:

```bash
# See all 2024 tables (human-readable table with columns: Year, Survey, Title, Data File)
npx @centoic/ipeds-fetch --years 2024 --tables "*" --list

# List enrollment-related tables as JSON (easier to parse programmatically)
npx @centoic/ipeds-fetch --years 2023 --tables "EF*" --list:json

# List institutional characteristics as TSV for spreadsheets
npx @centoic/ipeds-fetch --years 2020-2024 --tables "IC*,HD*" --list:tsv
```

**Output formats:**
- `--list` (text) — aligned-column table with survey, title, and data file name
- `--list:json` — `{ "query": {...}, "results": [...], "totalCount": N }` — includes URLs
- `--list:tsv` — tab-separated with headers (Year, Survey, Title, Data File, URLs)

### 2. Download Data Files

```bash
# Download a single table
npx @centoic/ipeds-fetch --years 2024 --tables HD2024 --output ./data

# Download with data dictionary (essential for understanding column meanings)
npx @centoic/ipeds-fetch --years 2024 --tables HD2024 --with-dictionaries --output ./data

# Download all enrollment data across a year range
npx @centoic/ipeds-fetch --years 2020-2024 --tables "EF*" --output ./enrollment-data

# Download multiple survey categories at once
npx @centoic/ipeds-fetch --years 2024 --tables "HD*,IC*,ADM*" --with-dictionaries --output ./ipeds-2024

# Download everything for one year
npx @centoic/ipeds-fetch --years 2024 --tables "*" --output ./ipeds-2024
```

### 3. Rate Limiting for Bulk Downloads

Add a delay between downloads to be respectful to NCES servers:

```bash
npx @centoic/ipeds-fetch --years 2000-2024 --tables "HD*" --delay 500 --output ./hd-data
```

### 4. Get Data Dictionaries

Data dictionaries (XLSX/XLS) explain each column in the CSV. Always download them when interpreting data:

```bash
npx @centoic/ipeds-fetch --years 2024 --tables EF2024A --with-dictionaries --output ./data
```

---

## Library API

For programmatic use in TypeScript/JavaScript:

```typescript
import {
    fetchTablesForYears,
    filterTablesByPatterns,
    parseTablePatterns,
    downloadTables,
    downloadZipAndExtract,
    parseYearSpec,
} from "@centoic/ipeds-fetch";

// Parse year specifications
const { years, warnings } = parseYearSpec("2020-2024");
// years = [2020, 2021, 2022, 2023, 2024]

// Scrape available tables for given years
const tables = await fetchTablesForYears([2024]);

// Filter by patterns
const patterns = parseTablePatterns("EF*,IC*");
const filtered = filterTablesByPatterns(tables, patterns);

// Download with progress callbacks
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

### Key Types

```typescript
interface TableMetadata {
    year: number;
    survey: string;        // e.g., "Institutional Characteristics"
    title: string;         // e.g., "Educational offerings, organization, services"
    tableName: string;     // e.g., "IC2024"
    dataFileUrl: string;   // URL to download CSV zip
    dictionaryUrl: string; // URL to download dictionary zip
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

---

## Important Behaviors

- **Scrape-first**: Download URLs are extracted from the IPEDS page HTML — they cannot be constructed manually (recent years use session-token generator endpoints).
- **Sequential downloads**: Files download one at a time, never in parallel.
- **De-duplication**: If a table appears under multiple survey categories on the same page, it is downloaded only once.
- **Best-effort failures**: If a single download fails, the tool logs the error and continues with remaining files. It exits with code 1 if any failures occurred.
- **Overwrite**: Running the same download twice overwrites existing files in the output directory.
- **Zip contents**: Data zips may contain multiple CSVs (e.g., `IC2015.csv` + `IC2015_rv.csv` for revisions). All are extracted. Multiple files trigger a warning.
- **Exit codes**: 0 for success, 1 for any error (invalid args, no matching tables, network failure, extraction failure).

---

## Tips

1. **Start with `--list`**: Discover what exists before downloading. This prevents downloading irrelevant or non-existent tables.
2. **Use JSON for scripting**: `--list:json` gives structured output including full download URLs.
3. **Always download dictionaries**: The XLSX files explain column codes, value meanings, and survey methodology.
4. **Match by prefix**: IPEDS tables follow `[Prefix][Year][Suffix]` naming (e.g., `EF2024A`). Use `--list` with `*` to see exact names.
5. **Use `--delay` for bulk downloads**: A 500ms delay is courteous when downloading many files across many years.
6. **Output directory is auto-created**: `--output` will create any missing directories (including parents).
7. **Wildcard is inclusive**: `EF*` matches `EF2024A`, `EF2024B`, `EFFY2024`, etc. Combine with year for precision: `EF2024*`.
