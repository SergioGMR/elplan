import type { OutputChannel } from './groupChannels';
import { resolveChannelLogo } from './channelLogos';

export type ApiChannel = {
    name: string;
    logo: string | null;
    logoExternal: string | null;
    links: string[];
};

const qualitySuffix = /\s+(?:4K|UHD|FHD|HD|SD)?\s*(?:\d{3,4}p)?$/i;

export const normalizeChannelName = (name: string) => {
    const cleaned = name.replace(qualitySuffix, '').trim();
    return cleaned || name.trim();
};

export const toApiChannels = (channels: OutputChannel[]) => {
    const map = new Map<
        string,
        { name: string; links: Set<string>; logo: string | null; logoExternal: string | null }
    >();

    for (const channel of channels) {
        const baseName = normalizeChannelName(channel.nombre);
        if (!baseName) {
            continue;
        }
        const entry =
            map.get(baseName) ??
            (() => {
                const logo = resolveChannelLogo(baseName);
                const value = {
                    name: baseName,
                    links: new Set<string>(),
                    logo: logo.logo,
                    logoExternal: logo.logoExternal,
                };
                map.set(baseName, value);
                return value;
            })();

        for (const link of channel.links) {
            entry.links.add(link);
        }
    }

    return [...map.values()]
        .map<ApiChannel>((entry) => ({
            name: entry.name,
            logo: entry.logo,
            logoExternal: entry.logoExternal,
            links: [...entry.links].sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};
