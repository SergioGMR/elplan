import { firefox } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

type Channel = {
    name: string
    link: string
}
type Channels = Channel[]
const channelsUrl = 'https://sites.google.com/view/elplandeportes/inicio'
const selectors = {
    presentation: '[role="presentation"]',
    link: 'a',
}
const closeChannels: Channels = []
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

const getAceStreamLink = async (link: string) => {
    const browser = await firefox.launch()
    const page = await browser.newPage()
    await page.goto('https://checkshorturl.com/')
    const tinyUrl = link
    await page.waitForSelector('#recherche', { state: 'visible', timeout: 5000 })
    await page.fill('#recherche', tinyUrl)
    await page.click('input[type="submit"]')
    await page.waitForSelector('#info > p:nth-child(4) > a')
    const longUrl = await page.getAttribute('#info > p:nth-child(4) > a', 'href')
    if (!longUrl) {
        throw new Error('Long URL not found')
    }
    console.log('Long URL:', longUrl)
    await browser.close()

    return longUrl
}

const main = async () => {
    const browser = await firefox.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(channelsUrl, { waitUntil: 'networkidle' })
    const items = await page.locator(selectors.presentation).all()

    for (const item of items) {
        const link = await item.evaluate((el) => el.firstElementChild?.getAttribute('href'))
        const name = await item.evaluate((el) => el.getAttribute('aria-label'))
        if (link && name && link?.startsWith('https')) {
            const cleanLink = decodeURIComponent(link.replace(/^https:\/\/www\.google\.com\/url\?q=/, '').replace(/&sa.*/, ''))
            closeChannels.push({ link: cleanLink, name })
        }
    }
    page.close()
    browser.close()

    await writeToDisk('rawChannels', closeChannels)

    console.log('Close channels: done!')

    for (const channel of closeChannels) {
        const aceStreamLink = await getAceStreamLink(channel.link)
        channels.push({ name: channel.name, link: aceStreamLink })
    }

    await writeToDisk('channels', channels)

}

await main()