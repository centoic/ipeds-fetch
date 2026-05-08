export const logger = {
    info(message: string): void {
        console.log(message);
    },

    warn(message: string): void {
        console.warn(message);
    },

    error(message: string): void {
        console.error(message);
    },

    progress(message: string): void {
        process.stdout.write(message);
    },

    progressComplete(message: string): void {
        console.log(message);
    },

    json(data: unknown): void {
        console.log(JSON.stringify(data, null, 4));
    },
};

export type Logger = typeof logger;
