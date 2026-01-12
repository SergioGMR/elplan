import { scrapeAndSave } from './scrape';
import { groupChannels } from './groupChannels';

type RefreshOptions = {
    headless?: boolean;
    saveRaw?: boolean;
};

export const refreshData = async (options: RefreshOptions = {}) => {
    const channels = await scrapeAndSave(options);
    const grouped = await groupChannels();
    return { channels: channels.length, groups: grouped.length };
};

if (import.meta.main) {
    const args = new Set(process.argv.slice(2));
    const saveRaw = args.has('--raw');
    const headless = !args.has('--headed');
    await refreshData({ saveRaw, headless });
}
