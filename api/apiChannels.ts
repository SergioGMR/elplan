import type { OutputChannel } from './groupChannels';
import { resolveChannelLogo } from './channelLogos';
import type { Quality, QualityLinks } from './types';
import { QUALITIES, emptyQualityLinks } from './types';

export type ApiChannel = {
    name: string;
    logo: string | null;
    logoExternal: string | null;
    links: QualityLinks;
};

const qualitySuffix = /\s+(?:4K|UHD|FHD|HD|SD)?\s*(?:\d{3,4}p)?$/i;

export const normalizeChannelName = (name: string) => {
    const cleaned = name.replace(qualitySuffix, '').trim();
    return cleaned || name.trim();
};

const mergeQualityLinks = (
    target: Record<Quality, Set<string>>,
    source: QualityLinks
) => {
    for (const q of QUALITIES) {
        for (const link of source[q]) {
            target[q].add(link);
        }
    }
};

const qualityLinksToSorted = (links: Record<Quality, Set<string>>): QualityLinks => ({
    '4k': [...links['4k']].sort(),
    '1080p': [...links['1080p']].sort(),
    '720p': [...links['720p']].sort(),
    sd: [...links.sd].sort(),
    unknown: [...links.unknown].sort(),
});

export const toApiChannels = (channels: OutputChannel[]): ApiChannel[] => {
    const map = new Map<
        string,
        {
            name: string;
            links: Record<Quality, Set<string>>;
            logo: string | null;
            logoExternal: string | null;
        }
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
                    links: {
                        '4k': new Set<string>(),
                        '1080p': new Set<string>(),
                        '720p': new Set<string>(),
                        sd: new Set<string>(),
                        unknown: new Set<string>(),
                    },
                    logo: logo.logo,
                    logoExternal: logo.logoExternal,
                };
                map.set(baseName, value);
                return value;
            })();

        mergeQualityLinks(entry.links, channel.links);
    }

    return [...map.values()]
        .map<ApiChannel>((entry) => ({
            name: entry.name,
            logo: entry.logo,
            logoExternal: entry.logoExternal,
            links: qualityLinksToSorted(entry.links),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

export const filterChannelsByQuality = (
    channels: ApiChannel[],
    qualities: Quality[]
): ApiChannel[] => {
    if (qualities.length === 0) {
        return channels;
    }

    return channels
        .map((channel) => {
            const filteredLinks: Partial<QualityLinks> = {};
            let hasLinks = false;

            for (const q of qualities) {
                if (channel.links[q].length > 0) {
                    filteredLinks[q] = channel.links[q];
                    hasLinks = true;
                }
            }

            if (!hasLinks) {
                return null;
            }

            return {
                ...channel,
                links: filteredLinks as QualityLinks,
            };
        })
        .filter((c): c is ApiChannel => c !== null);
};
