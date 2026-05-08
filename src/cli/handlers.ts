import { parseYearSpec } from "../lib/parse-year-spec.js";
import { fetchTablesForYears } from "../lib/scrape-tables.js";
import {
    filterTablesByPatterns,
    parseTablePatterns,
} from "../lib/table-patterns.js";
import {
    downloadTables,
    type DownloadItemResult,
} from "../lib/download-zip.js";
import { logger } from "../lib/logger.js";
import type { TableMetadata } from "../lib/types.js";
import type { CliOptions } from "./types.js";

const formatPatternLabel = (patterns: string[]): string => {
    return patterns.length === 1 ? patterns[0] : patterns.join(", ");
};

const formatYearLabel = (years: number[]): string => {
    if (years.length === 1) {
        return `year ${years[0]}`;
    }
    return `years ${years.join(", ")}`;
};

const printTextTable = (tables: TableMetadata[]): void => {
    const headers = ["Year", "Survey", "Title", "Data File"];
    const rows = tables.map((table) => [
        String(table.year),
        table.survey,
        table.title,
        table.tableName,
    ]);

    const widths = headers.map((header, index) => {
        const values = rows.map((row) => row[index] ?? "");
        return Math.max(header.length, ...values.map((value) => value.length));
    });

    const pad = (value: string, width: number): string =>
        value.padEnd(width, " ");

    const headerLine = headers
        .map((header, index) => pad(header, widths[index]))
        .join("  ");
    const separatorLine = widths.map((width) => "-".repeat(width)).join("  ");

    logger.info(headerLine);
    logger.info(separatorLine);

    for (const row of rows) {
        const line = row
            .map((value, index) => pad(value, widths[index]))
            .join("  ");
        logger.info(line);
    }
};

const printJson = (
    tables: TableMetadata[],
    years: number[],
    patterns: string[]
): void => {
    const payload = {
        query: {
            years,
            patterns,
        },
        results: tables.map((table) => ({
            year: table.year,
            survey: table.survey,
            title: table.title,
            tableName: table.tableName,
            dataFileUrl: table.dataFileUrl,
            dictionaryUrl: table.dictionaryUrl,
        })),
        totalCount: tables.length,
    };

    logger.json(payload);
};

const printTsv = (tables: TableMetadata[]): void => {
    logger.info(
        [
            "Year",
            "Survey",
            "Title",
            "Data File",
            "Data File URL",
            "Dictionary URL",
        ].join("\t")
    );

    for (const table of tables) {
        logger.info(
            [
                table.year,
                table.survey,
                table.title,
                table.tableName,
                table.dataFileUrl,
                table.dictionaryUrl,
            ].join("\t")
        );
    }
};

export const handleList = async (options: CliOptions): Promise<void> => {
    if (!options.yearsSpec || !options.tablesSpec) {
        throw new Error("List mode requires --years and --tables options.");
    }

    const { years, warnings } = parseYearSpec(options.yearsSpec);
    for (const warning of warnings) {
        logger.warn(`Warning: ${warning}`);
    }

    const patterns = parseTablePatterns(options.tablesSpec);
    const allTables = await fetchTablesForYears(years);
    const filteredTables = filterTablesByPatterns(allTables, patterns);

    const format = options.listFormat ?? "text";
    if (format === "json") {
        printJson(filteredTables, years, patterns);
    } else if (format === "tsv") {
        printTsv(filteredTables);
    } else {
        printTextTable(filteredTables);
    }

    const patternLabel = formatPatternLabel(patterns);
    const yearLabel = formatYearLabel(years);
    logger.info(
        `Found ${filteredTables.length} tables matching pattern${
            patterns.length === 1 ? "" : "s"
        } "${patternLabel}" for ${yearLabel}.`
    );
};

export const handleDownload = async (options: CliOptions): Promise<void> => {
    if (!options.yearsSpec || !options.tablesSpec) {
        throw new Error("Download mode requires --years and --tables options.");
    }

    const { years, warnings } = parseYearSpec(options.yearsSpec);
    for (const warning of warnings) {
        logger.warn(`Warning: ${warning}`);
    }

    const patterns = parseTablePatterns(options.tablesSpec);
    const allTables = await fetchTablesForYears(years);
    const filteredTables = filterTablesByPatterns(allTables, patterns);

    if (filteredTables.length === 0) {
        const patternLabel = formatPatternLabel(patterns);
        const yearLabel = formatYearLabel(years);
        logger.error(
            `No tables found matching pattern${
                patterns.length === 1 ? "" : "s"
            } "${patternLabel}" for ${yearLabel}.`
        );
        logger.info("  Hint: Use --list to see available tables.");
        process.exit(1);
    }

    const progressMessages: string[] = [];
    const onProgress = (message: string): void => {
        progressMessages.push(message);
        logger.progress(message);
    };

    const onWarning = (message: string): void => {
        logger.warn(message);
    };

    const failures: { table: TableMetadata; result: DownloadItemResult }[] = [];

    const onItemComplete = (
        table: TableMetadata,
        result: DownloadItemResult
    ): void => {
        if (!result.success && result.error) {
            failures.push({ table, result });
        }
    };

    let totalFiles = 0;
    const onAllComplete = (count: number): void => {
        totalFiles = count;
    };

    await downloadTables({
        tables: filteredTables,
        outputDir: options.outputDir,
        withDictionaries: options.withDictionaries,
        delayMs: options.delayMs,
        onProgress,
        onWarning,
        onItemComplete,
        onAllComplete,
    });

    logger.info(
        `Download complete: ${totalFiles} files saved to ${options.outputDir}`
    );

    if (failures.length > 0) {
        logger.error(
            `Error: ${failures.length} download${failures.length === 1 ? "" : "s"} failed.`
        );
        for (const { table, result } of failures) {
            const error = result.error!;
            const label =
                result.type === "dictionary"
                    ? `${table.tableName} dictionary`
                    : table.tableName;
            const action = error.category === "extraction" ? "extract" : "download";
            const detailLabel = error.isHttpError ? "HTTP Status" : "Details";
            const detailValue = error.isHttpError
                ? `${error.httpStatus ?? ""} ${error.httpStatusText ?? ""}`.trim()
                : error.message;

            logger.error(`  - Failed to ${action} ${label}`);
            if (error.url) {
                logger.error(`    URL: ${error.url}`);
            }
            logger.error(`    ${detailLabel}: ${detailValue}`);
        }
        process.exit(1);
    }
};
