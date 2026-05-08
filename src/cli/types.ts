export type ListFormat = "text" | "json" | "tsv";

export interface CliOptions {
    yearsSpec?: string;
    tablesSpec?: string;
    listFormat?: ListFormat;
    withDictionaries: boolean;
    outputDir: string;
    delayMs?: number;
    help: boolean;
    version: boolean;
}

export interface ParseResult {
    options: CliOptions;
    errors: string[];
}
