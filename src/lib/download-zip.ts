import fs from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as unzipper from "unzipper";

import type { TableMetadata } from "./types.js";

export interface ExtractedFile {
    fileName: string;
    sizeBytes: number;
}

export interface DownloadZipResult {
    files: ExtractedFile[];
    originalPaths: string[];
}

export interface DownloadErrorInfo {
    message: string;
    category: "download" | "extraction";
    url: string;
    isHttpError: boolean;
    httpStatus?: number;
    httpStatusText?: string;
}

export interface DownloadItemResult {
    type: "data" | "dictionary";
    success: boolean;
    files: ExtractedFile[];
    error?: DownloadErrorInfo;
}

export interface DownloadTablesOptions {
    tables: TableMetadata[];
    outputDir: string;
    withDictionaries?: boolean;
    delayMs?: number;
    onProgress?: (message: string) => void;
    onWarning?: (message: string) => void;
    onItemComplete?: (
        table: TableMetadata,
        itemResult: DownloadItemResult
    ) => void;
    onAllComplete?: (totalFiles: number) => void;
}

const delayFn = async (delayMs: number): Promise<void> => {
    await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
    });
};

class IpedsDownloadError extends Error {
    constructor(
        message: string,
        public readonly category: "download" | "extraction",
        public readonly httpStatus?: number,
        public readonly httpStatusText?: string
    ) {
        super(message);
    }
}

const checkDirectoryWritable = async (dir: string): Promise<void> => {
    try {
        const testFile = path.join(dir, `.write-test-${Date.now()}`);
        await writeFile(testFile, "");
        await unlink(testFile);
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Output directory is not writable: ${dir}\n  Details: ${details}`
        );
    }
};

const deduplicateTables = (tables: TableMetadata[]): TableMetadata[] => {
    const uniqueTables: TableMetadata[] = [];
    const seenTables = new Set<string>();
    for (const table of tables) {
        if (seenTables.has(table.tableName)) {
            continue;
        }
        seenTables.add(table.tableName);
        uniqueTables.push(table);
    }
    return uniqueTables;
};

const writeResponseToFile = async (
    response: Response,
    destination: string
): Promise<void> => {
    if (!response.body) {
        throw new Error("Response body is empty.");
    }

    const bodyStream = Readable.fromWeb(
        response.body as unknown as ReadableStream<Uint8Array>
    );
    await pipeline(bodyStream, fs.createWriteStream(destination));
};

export const downloadZipAndExtract = async (
    url: string,
    outputDir: string
): Promise<DownloadZipResult> => {
    await mkdir(outputDir, { recursive: true });
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ipeds-download-"));
    const zipPath = path.join(tempDir, "download.zip");

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new IpedsDownloadError(
                `HTTP ${response.status} ${response.statusText}`,
                "download",
                response.status,
                response.statusText
            );
        }

        await writeResponseToFile(response, zipPath);
    } catch (error) {
        if (error instanceof IpedsDownloadError) {
            throw error;
        }
        const details = error instanceof Error ? error.message : String(error);
        await rm(tempDir, { recursive: true, force: true });
        throw new IpedsDownloadError(details, "download");
    }

    try {
        const directory = await unzipper.Open.file(zipPath);
        const files: ExtractedFile[] = [];
        const originalPaths: string[] = [];

        for (const entry of directory.files) {
            if (entry.type === "Directory") {
                continue;
            }

            const entryPath = entry.path ?? "";
            if (!entryPath) {
                continue;
            }

            originalPaths.push(entryPath);
            const fileName = path.basename(entryPath);
            const destination = path.join(outputDir, fileName);

            await pipeline(entry.stream(), fs.createWriteStream(destination));
            const fileStats = await stat(destination);
            files.push({ fileName, sizeBytes: fileStats.size });
        }

        return { files, originalPaths };
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new IpedsDownloadError(details, "extraction");
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
};

export const downloadTables = async (
    options: DownloadTablesOptions
): Promise<number> => {
    const {
        tables,
        outputDir,
        withDictionaries = false,
        delayMs,
        onProgress,
        onWarning,
        onItemComplete,
        onAllComplete,
    } = options;

    await mkdir(outputDir, { recursive: true });
    await checkDirectoryWritable(outputDir);

    const uniqueTables = deduplicateTables(tables);

    if (uniqueTables.length === 0) {
        return 0;
    }

    const downloadItems: {
        table: TableMetadata;
        type: "data" | "dictionary";
    }[] = [];

    for (const table of uniqueTables) {
        downloadItems.push({ table, type: "data" });
        if (withDictionaries) {
            downloadItems.push({ table, type: "dictionary" });
        }
    }

    const totalItems = downloadItems.length;
    let downloadedFiles = 0;

    for (let index = 0; index < downloadItems.length; index += 1) {
        const item = downloadItems[index];
        const table = item.table;
        const isDictionary = item.type === "dictionary";

        const url = isDictionary ? table.dictionaryUrl : table.dataFileUrl;
        const fileLabel = isDictionary
            ? `${table.tableName} dictionary`
            : table.tableName;

        if (!url) {
            const result: DownloadItemResult = {
                type: item.type,
                success: false,
                files: [],
                error: {
                    message: isDictionary
                        ? "Dictionary URL not available"
                        : "Data file URL not available",
                    category: "download",
                    url: "",
                    isHttpError: false,
                },
            };
            onItemComplete?.(table, result);
            continue;
        }

        onProgress?.(
            `[${index + 1}/${totalItems}] Downloading ${fileLabel}...`
        );

        try {
            const result = await downloadZipAndExtract(url, outputDir);

            if (result.files.length === 0) {
                onProgress?.(` done (0 KB)\n`);
                onWarning?.(`Warning: No files extracted for ${fileLabel}.`);
            } else {
                const totalSize = result.files.reduce(
                    (sum, file) => sum + file.sizeBytes,
                    0
                );
                const sizeStr =
                    totalSize >= 1024 * 1024
                        ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(totalSize / 1024))} KB`;
                onProgress?.(` done (${sizeStr})\n`);
            }

            if (result.files.length > 1) {
                const fileList = result.files
                    .map((file) => file.fileName)
                    .join(", ");
                onWarning?.(
                    `Warning: ${fileLabel} zip contained multiple files: ${fileList}`
                );
            }

            downloadedFiles += result.files.length;
            onItemComplete?.(table, {
                type: item.type,
                success: true,
                files: result.files,
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const isExtract =
                error instanceof IpedsDownloadError &&
                error.category === "extraction";
            const isHttpError =
                error instanceof IpedsDownloadError &&
                error.httpStatus !== undefined;
            onProgress?.(` failed\n`);
            onItemComplete?.(table, {
                type: item.type,
                success: false,
                files: [],
                error: {
                    message: errorMessage,
                    category: isExtract ? "extraction" : "download",
                    url,
                    isHttpError,
                    httpStatus:
                        error instanceof IpedsDownloadError
                            ? error.httpStatus
                            : undefined,
                    httpStatusText:
                        error instanceof IpedsDownloadError
                            ? error.httpStatusText
                            : undefined,
                },
            });
        }

        if (delayMs && index < downloadItems.length - 1) {
            await delayFn(delayMs);
        }
    }

    onAllComplete?.(downloadedFiles);
    return downloadedFiles;
};
