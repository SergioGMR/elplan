import { firefox } from 'playwright';

import type { Channel, DataEnvelope } from './types';
import { writeJson } from './storage';

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

export const scrapeChannels = async (options: ScrapeOptions = {}) => {
    const headless =
        typeof options.headless === 'boolean'
            ? options.headless
            : process.env.HEADLESS !== 'false';
    const timeoutMs = Number(options.timeoutMs ?? process.env.SCRAPE_TIMEOUT_MS ?? 20000);
    const channels: Channel[] = [];
    const uniqueLinks = new Set<string>();

    const browser = await firefox.launch({ headless });
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    try {
        await page.goto(channelsUrl, { waitUntil: 'networkidle' });
        await page.waitForSelector(selectors.card, { state: 'attached' });
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
