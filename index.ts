import { firefox } from 'playwright'

import groupMain from './groupChannels'

import fs from 'node:fs'
import path from 'node:path'

type Channel = {
    name: string
    link: string
}
type Channels = Channel[]
const channelsUrl = 'https://aceid.vercel.app/listado/'
const selectors = {
    card: 'div.card',
    name: 'div.card-header > h5',
    link: 'div.card-footer > div > div.text-end > span[title]'
}
const channels: Channels = []

const writeToDisk = async (file: string, channels: Channels) => {
    const data = {
        data: channels,
        updated: Date.now()
    };

    try {
        // Ruta para guardar el archivo en la carpeta ./data
        const filePath = path.join(__dirname, 'data', `${file}.json`);

        // Verifica si la carpeta existe, si no, la crea
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log('File written successfully!');
    } catch (error) {
        console.error('Error writing to file: ', error);
    }
}

export const main = async () => {
    const browser = await firefox.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(channelsUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector(selectors.card, { state: 'attached', timeout: 15000 })
    await page.waitForSelector(selectors.link, { state: 'attached', timeout: 15000 })
    const cards = await page.locator(selectors.card).all()
    const cardCount = cards.length
    const uniqueLinks = new Set<string>()

    for (const card of cards) {
        const rawName = await card.locator(selectors.name).textContent()
        const name = rawName?.trim()
        if (!name) {
            continue
        }

        const linkSpans = await card.locator(selectors.link).all()
        for (const span of linkSpans) {
            const title = await span.getAttribute('title')
            const link = title?.trim()
            if (!link || !link.startsWith('acestream://')) {
                continue
            }
            const key = `${name}:::${link}`
            if (uniqueLinks.has(key)) {
                continue
            }
            uniqueLinks.add(key)
            channels.push({ name, link })
        }
    }

    await page.close()
    await browser.close()
    await writeToDisk('rawChannels', channels)
    await writeToDisk('channels', channels)
    console.log(`Collected ${channels.length} AceStream links from ${cardCount} cards`)
}

if (import.meta.main) {
    await main()
}

// await groupMain()
