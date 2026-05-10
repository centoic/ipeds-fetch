import { runCli } from "./cli.js";
import { logger } from "../lib/logger.js";

runCli(process.argv.slice(2), process.cwd()).catch((error) => {
    if (error instanceof Error) {
        logger.error(error.message);
    } else {
        logger.error(String(error));
    }
    process.exit(1);
});
