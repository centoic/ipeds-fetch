import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleDownload, handleList } from "./handlers.js";
import { parseCliArgs } from "./parse-args.js";
import { getUsage } from "./usage.js";
import { logger } from "../lib/logger.js";

const getPackageVersion = (): string => {
    const currentFile = fileURLToPath(import.meta.url);
    const packagePath = path.resolve(
        path.dirname(currentFile),
        "../../package.json"
    );
    const contents = readFileSync(packagePath, "utf-8");
    const parsed = JSON.parse(contents) as { version?: string };
    return parsed.version ?? "0.0.0";
};

const printUsage = (): void => {
    logger.info(getUsage());
};

const printErrors = (errors: string[]): void => {
    for (const error of errors) {
        logger.error(`Error: ${error}`);
    }
};

export const runCli = async (argv: string[], cwd: string): Promise<void> => {
    const { options, errors } = parseCliArgs(argv, cwd);

    if (errors.length > 0) {
        printErrors(errors);
        printUsage();
        process.exit(1);
        return;
    }

    if (options.help) {
        printUsage();
        return;
    }

    if (options.version) {
        logger.info(getPackageVersion());
        return;
    }

    if (options.listFormat) {
        await handleList(options);
        return;
    }

    await handleDownload(options);
};
