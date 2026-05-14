export type ListFormat = "text" | "json" | "tsv";
export type DictionaryFormat = "original" | "text";

export interface CliOptions {
    yearsSpec?: string;
    tablesSpec?: string;
    listFormat?: ListFormat;
    withDictionaries: boolean;
    dictionaryFormat: DictionaryFormat;
    outputDir: string;
    delayMs?: number;
    help: boolean;
    version: boolean;
}

export interface ParseResult {
    options: CliOptions;
    errors: string[];
}
