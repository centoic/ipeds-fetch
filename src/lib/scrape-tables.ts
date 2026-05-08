import { chromium, type Browser, type Page } from "playwright";

import type { TableMetadata } from "./types.js";

const BASE_URL = "https://nces.ed.gov/ipeds/datacenter";
const LOGIN_URL = `${BASE_URL}/login.aspx?gotoReportId=7`;
const DEFAULT_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YearOption {
    value: string;
    text: string;
}

const resolveHref = (href: string | null): string => {
    if (!href) {
        return "";
    }
    if (href.startsWith("http://") || href.startsWith("https://")) {
        return href;
    }
    if (href.startsWith("/")) {
        return `https://nces.ed.gov${href}`;
    }
    return `${BASE_URL}/${href}`;
};

const ensureDataFilesPage = async (page: Page): Promise<void> => {
    await page.goto(LOGIN_URL, { waitUntil: "networkidle" });
    const continueButton = page.locator('input#ImageButton1[title="Continue"]');
    if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click();
        await page.waitForLoadState("networkidle");
    }
};

const getYearOptions = async (page: Page): Promise<YearOption[]> => {
    const yearDropdown = page.locator('select[id*="ddlYears"]');
    await yearDropdown.waitFor({ state: "visible", timeout: 10000 });
    const optionLocators = await yearDropdown.locator("option").all();
    const options: YearOption[] = [];

    for (const option of optionLocators) {
        const value = (await option.getAttribute("value")) ?? "";
        const text = (await option.textContent())?.trim() ?? "";
        if (value) {
            options.push({ value, text });
        }
    }

    return options;
};

const findYearValue = (year: number, options: YearOption[]): string | null => {
    const yearText = String(year);
    const exact = options.find((option) => option.text === yearText);
    if (exact) {
        return exact.value;
    }
    const startsWith = options.find((option) =>
        option.text.startsWith(yearText)
    );
    if (startsWith) {
        return startsWith.value;
    }
    const valueMatch = options.find((option) => option.value === yearText);
    return valueMatch ? valueMatch.value : null;
};

const selectYear = async (page: Page, yearValue: string): Promise<void> => {
    const yearDropdown = page.locator('select[id*="ddlYears"]');
    const currentValue = await yearDropdown.inputValue().catch(() => "");

    if (currentValue !== yearValue) {
        await yearDropdown.selectOption(yearValue);
        await page.waitForLoadState("networkidle");
    }

    const continueAfterYear = page.locator('input[id*="ibtnContinue"]');
    if (await continueAfterYear.isVisible().catch(() => false)) {
        await continueAfterYear.click();
        await page.waitForLoadState("networkidle");
    }
};

const extractTablesForYear = async (
    page: Page,
    fallbackYear: number
): Promise<TableMetadata[]> => {
    const tables: TableMetadata[] = [];
    const tableLocator = page.locator('table[id*="tblResult"]');
    await tableLocator.waitFor({ timeout: 10000 }).catch(() => null);

    if (!(await tableLocator.isVisible().catch(() => false))) {
        return tables;
    }

    const rows = await tableLocator.locator("tr").all();
    for (let index = 1; index < rows.length; index += 1) {
        const cells = await rows[index].locator("td").all();
        if (cells.length < 7) {
            continue;
        }

        const rawYear = (await cells[0].textContent())?.trim() ?? "";
        const year = Number.parseInt(rawYear, 10) || fallbackYear;
        const survey = (await cells[1].textContent())?.trim() ?? "";
        const title = (await cells[2].textContent())?.trim() ?? "";
        const tableName = (await cells[3].textContent())?.trim() ?? "";

        const dataHref = await cells[3]
            .locator("a")
            .getAttribute("href")
            .catch(() => null);
        const dictHref = await cells[6]
            .locator("a")
            .getAttribute("href")
            .catch(() => null);

        tables.push({
            year,
            survey,
            title,
            tableName,
            dataFileUrl: resolveHref(dataHref),
            dictionaryUrl: resolveHref(dictHref),
        });
    }

    return tables;
};

export const fetchTablesForYears = async (
    years: number[]
): Promise<TableMetadata[]> => {
    let browser: Browser | null = null;

    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: DEFAULT_USER_AGENT,
        });
        const page = await context.newPage();

        await ensureDataFilesPage(page);
        const yearOptions = await getYearOptions(page);
        const results: TableMetadata[] = [];

        for (const year of years) {
            try {
                const yearValue = findYearValue(year, yearOptions);
                if (!yearValue) {
                    continue;
                }

                await selectYear(page, yearValue);
                const yearTables = await extractTablesForYear(page, year);
                results.push(...yearTables);
            } catch (error) {
                const details =
                    error instanceof Error ? error.message : String(error);
                throw new Error(
                    `Network request failed while fetching table list for year ${year}.\n  URL: ${BASE_URL}/DataFiles.aspx\n  Details: ${details}`
                );
            }
        }

        return results;
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.startsWith(
                "Network request failed while fetching table list"
            )
        ) {
            throw error;
        }
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Network request failed while fetching table list.\n  URL: ${BASE_URL}/DataFiles.aspx\n  Details: ${details}`
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
