import { chromium } from 'playwright-chromium';
import type { Page } from 'playwright-chromium';

import type { Channel, DataEnvelope } from '../api/types';
import { writeJson } from '../api/storage';

const channelsUrl = 'https://aceid.vercel.app/listado/';
const selectors = {
    card: 'div.card',
    name: 'div.card-header > h5',
    link: 'div.card-footer > div > div.text-end > span[title]',
};

type ScrapeOptions = {
    headless?: boolean;
    saveRaw?: boolean;
    timeoutMs?: number;
};

const checkpointTitle = 'Vercel Security Checkpoint';

const applyStealth = async (page: Page) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['es-ES', 'es', 'en'],
        });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        (window as unknown as { chrome?: { runtime: Record<string, unknown> } }).chrome = {
            runtime: {},
        };
    });
};

const waitForCards = async (page: Page, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    let lastTitle = '';

    while (Date.now() < deadline) {
        try {
            lastTitle = await page.title();
        } catch {
            lastTitle = '';
        }

        if (lastTitle.includes(checkpointTitle)) {
            console.warn('Vercel checkpoint detected, retrying...');
            await page.waitForTimeout(2500);
            await page.reload({ waitUntil: 'domcontentloaded' });
            continue;
        }

        const count = await page.locator(selectors.card).count();
        if (count > 0) {
            return;
        }

        await page.waitForTimeout(500);
    }

    throw new Error(`Timeout waiting for channels. Last title: ${lastTitle || 'unknown'}`);
};

export const scrapeChannels = async (options: ScrapeOptions = {}) => {
    const headless =
        typeof options.headless === 'boolean'
            ? options.headless
            : process.env.HEADLESS !== 'false';
    const timeoutMs = Number(options.timeoutMs ?? process.env.SCRAPE_TIMEOUT_MS ?? 60000);
    const channels: Channel[] = [];
    const uniqueLinks = new Set<string>();

    const browser = await chromium.launch({
        headless,
        args: ['--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
        userAgent:
            process.env.SCRAPE_USER_AGENT ??
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: process.env.SCRAPE_LOCALE ?? 'es-ES',
        viewport: { width: 1365, height: 768 },
    });
    const page = await context.newPage();
    await applyStealth(page);
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    try {
        await page.goto(channelsUrl, { waitUntil: 'domcontentloaded' });
        await waitForCards(page, timeoutMs);
        await page.waitForSelector(selectors.link, { state: 'attached' });

        const cards = await page.locator(selectors.card).all();
        for (const card of cards) {
            const rawName = await card.locator(selectors.name).textContent();
            const name = rawName?.trim();
            if (!name) {
                continue;
            }

            const linkSpans = await card.locator(selectors.link).all();
            for (const span of linkSpans) {
                const title = await span.getAttribute('title');
                const link = title?.trim();
                if (!link || !link.startsWith('acestream://')) {
                    continue;
                }
                const key = `${name}:::${link}`;
                if (uniqueLinks.has(key)) {
                    continue;
                }
                uniqueLinks.add(key);
                channels.push({ name, link });
            }
        }
    } finally {
        await page.close();
        await context.close();
        await browser.close();
    }

    return channels;
};

export const saveChannels = async (channels: Channel[], options: ScrapeOptions = {}) => {
    const envelope: DataEnvelope<Channel[]> = {
        data: channels,
        updated: Date.now(),
    };

    await writeJson('channels.json', envelope);

    if (options.saveRaw ?? process.env.SAVE_RAW === 'true') {
        await writeJson('rawChannels.json', envelope);
    }
};

export const scrapeAndSave = async (options: ScrapeOptions = {}) => {
    const channels = await scrapeChannels(options);
    await saveChannels(channels, options);
    return channels;
};

if (import.meta.main) {
    const args = new Set(process.argv.slice(2));
    const saveRaw = args.has('--raw');
    const headless = !args.has('--headed');
    await scrapeAndSave({ saveRaw, headless });
}
