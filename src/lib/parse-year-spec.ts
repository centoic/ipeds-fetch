const MIN_IPEDS_YEAR = 1980;

export interface ParseYearSpecResult {
    years: number[];
    warnings: string[];
}

const isIntegerString = (value: string): boolean => {
    return /^\d+$/.test(value);
};

const parseYearValue = (value: string): number => {
    if (!isIntegerString(value)) {
        throw new Error(`Invalid year "${value}". Years must be integers.`);
    }
    return Number(value);
};

const addWarningIfOutOfRange = (
    warnings: string[],
    year: number,
    currentYear: number
): void => {
    if (year < MIN_IPEDS_YEAR || year > currentYear) {
        warnings.push(
            `Year ${year} is outside the valid IPEDS range (${MIN_IPEDS_YEAR}-${currentYear}).`
        );
    }
};

const expandRange = (
    start: number,
    end: number,
    currentYear: number,
    warnings: string[]
): number[] => {
    if (start > end) {
        throw new Error(
            `Invalid year range "${start}-${end}". Range start must be less than or equal to range end.`
        );
    }

    const years: number[] = [];
    for (let year = start; year <= end; year += 1) {
        addWarningIfOutOfRange(warnings, year, currentYear);
        years.push(year);
    }
    return years;
};

export const parseYearSpec = (spec: string): ParseYearSpecResult => {
    const trimmed = spec.trim();
    if (!trimmed) {
        throw new Error("Year specification cannot be empty.");
    }

    const currentYear = new Date().getFullYear();
    if (trimmed.toLowerCase() === "all") {
        const years: number[] = [];
        for (let year = MIN_IPEDS_YEAR; year <= currentYear; year += 1) {
            years.push(year);
        }
        return { years, warnings: [] };
    }

    const warnings: string[] = [];
    const rawParts = trimmed.split(",");
    const collectedYears: number[] = [];

    for (const rawPart of rawParts) {
        const part = rawPart.trim();
        if (!part) {
            throw new Error("Year specification contains an empty segment.");
        }

        if (part.includes("-")) {
            const rangeParts = part.split("-").map((value) => value.trim());
            if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
                throw new Error(
                    `Invalid range "${part}". Use the format "start-end".`
                );
            }

            const start = parseYearValue(rangeParts[0]);
            const end = parseYearValue(rangeParts[1]);
            collectedYears.push(
                ...expandRange(start, end, currentYear, warnings)
            );
            continue;
        }

        const year = parseYearValue(part);
        addWarningIfOutOfRange(warnings, year, currentYear);
        collectedYears.push(year);
    }

    const uniqueYears = Array.from(new Set(collectedYears)).sort(
        (a, b) => a - b
    );

    return { years: uniqueYears, warnings };
};
