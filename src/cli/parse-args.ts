import type { CliOptions, ListFormat, ParseResult } from "./types.js";

const listFormats: ListFormat[] = ["text", "json", "tsv"];

const isListArg = (value: string): boolean => {
    return value === "--list" || value.startsWith("--list:");
};

const parseListFormat = (
    value: string
): { format?: ListFormat; error?: string } => {
    if (value === "--list") {
        return { format: "text" };
    }

    const rawFormat = value.slice("--list:".length).trim();
    if (listFormats.includes(rawFormat as ListFormat)) {
        return { format: rawFormat as ListFormat };
    }

    return {
        error: `Invalid list format "${rawFormat}". Use text, json, or tsv.`,
    };
};

const requireValue = (
    args: string[],
    index: number,
    name: string,
    errors: string[]
): string | undefined => {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        errors.push(`Missing value for ${name}.`);
        return undefined;
    }
    return value;
};

const parseDelay = (value: string, errors: string[]): number | undefined => {
    const delay = Number(value);
    if (!Number.isInteger(delay) || delay < 0) {
        errors.push(
            `Invalid delay "${value}". Provide a non-negative integer.`
        );
        return undefined;
    }
    return delay;
};

export const parseCliArgs = (args: string[], cwd: string): ParseResult => {
    const errors: string[] = [];
    const options: CliOptions = {
        withDictionaries: false,
        outputDir: cwd,
        help: false,
        version: false,
    };

    let index = 0;
    while (index < args.length) {
        const arg = args[index];

        if (arg === "--help") {
            options.help = true;
            index += 1;
            continue;
        }

        if (arg === "--version") {
            options.version = true;
            index += 1;
            continue;
        }

        if (arg === "--with-dictionaries") {
            options.withDictionaries = true;
            index += 1;
            continue;
        }

        if (isListArg(arg)) {
            const result = parseListFormat(arg);
            if (result.error) {
                errors.push(result.error);
            } else {
                options.listFormat = result.format;
            }
            index += 1;
            continue;
        }

        if (arg === "--years") {
            const value = requireValue(args, index, "--years", errors);
            if (value) {
                options.yearsSpec = value;
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }

        if (arg === "--tables") {
            const value = requireValue(args, index, "--tables", errors);
            if (value) {
                options.tablesSpec = value;
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }

        if (arg === "--output") {
            const value = requireValue(args, index, "--output", errors);
            if (value) {
                options.outputDir = value;
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }

        if (arg === "--delay") {
            const value = requireValue(args, index, "--delay", errors);
            if (value) {
                options.delayMs = parseDelay(value, errors);
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }

        errors.push(`Unknown option "${arg}".`);
        index += 1;
    }

    if (!options.help && !options.version) {
        if (!options.yearsSpec) {
            errors.push("Missing required --years <spec>.");
        }
        if (!options.tablesSpec) {
            errors.push("Missing required --tables <patterns>.");
        }
    }

    return { options, errors };
};
