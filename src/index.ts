export { runCli } from "./cli/cli.js";
export type {
    CliOptions,
    DictionaryFormat,
    ListFormat,
    ParseResult,
} from "./cli/types.js";
export type { ParseYearSpecResult } from "./lib/parse-year-spec.js";
export { parseYearSpec } from "./lib/parse-year-spec.js";
export { fetchTablesForYears } from "./lib/scrape-tables.js";
export {
    filterTablesByPatterns,
    parseTablePatterns,
} from "./lib/table-patterns.js";
export { downloadZipAndExtract, downloadTables } from "./lib/download-zip.js";
export type { TableMetadata } from "./lib/types.js";
export type {
    DownloadZipResult,
    DownloadTablesOptions,
    DownloadItemResult,
    DownloadErrorInfo,
    ExtractedFile,
} from "./lib/download-zip.js";
