import type { TableMetadata } from "./types.js";

const escapeRegex = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const patternToRegex = (pattern: string): RegExp => {
    let regexSource = "";
    for (const char of pattern) {
        if (char === "*") {
            regexSource += ".*";
            continue;
        }
        if (char === "?") {
            regexSource += ".";
            continue;
        }
        regexSource += escapeRegex(char);
    }
    return new RegExp(`^${regexSource}$`, "i");
};

export const parseTablePatterns = (spec: string): string[] => {
    return spec
        .split(",")
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0);
};

export const matchTablePatterns = (
    tableName: string,
    patterns: string[]
): boolean => {
    if (patterns.length === 0) {
        return false;
    }

    return patterns.some((pattern) => {
        const regex = patternToRegex(pattern);
        return regex.test(tableName);
    });
};

export const filterTablesByPatterns = (
    tables: TableMetadata[],
    patterns: string[]
): TableMetadata[] => {
    if (patterns.length === 0) {
        return [];
    }
    return tables.filter((table) =>
        matchTablePatterns(table.tableName, patterns)
    );
};
