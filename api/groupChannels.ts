import type { Channel, DataEnvelope, Quality, QualityLinks } from './types';
import { emptyQualityLinks } from './types';
import { readJson, writeJson } from './storage';

export type OutputChannel = {
    nombre: string;
    links: QualityLinks;
    tags: string[];
};

export const extractQuality = (name: string): Quality => {
    if (/4k|uhd/i.test(name)) return '4k';
    if (/1080p?|fhd/i.test(name)) return '1080p';
    if (/720p?(?![0-9])|(?<![u])hd(?![d0-9])/i.test(name)) return '720p';
    if (/sd|480p?|576p?/i.test(name)) return 'sd';
    return 'unknown';
};

const normalizeSpacing = (value: string) => {
    return value.replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim();
};

const optionRegex = /(.*?)(?:\s*-\s*)?(Opción|Opcion)\s*(\d+)?\s*$/i;

const parseOptionName = (name: string) => {
    const match = name.match(optionRegex);
    if (!match) {
        return null;
    }
    const parentName = normalizeSpacing(match[1] ?? '');
    if (!parentName) {
        return null;
    }
    const optionNumber = match[3]?.trim();
    const optionLabel = optionNumber ? `Opción ${optionNumber}` : 'Opción';
    return {
        parentName,
        optionName: normalizeSpacing(`${parentName} - ${optionLabel}`),
    };
};

const expandAbbreviations = (name: string) => {
    let expanded = name;
    const replacements: Array<[RegExp, string]> = [
        [/D\.?\s*L\.?\s*2\.?\s*(Opción|Opcion)/gi, 'DAZN LaLiga 2 - Opción'],
        [/D\.?\s*L\.?\s*(Opción|Opcion)/gi, 'DAZN LaLiga - Opción'],
        [/D\.?\s*L\.?\s*2\.?/gi, 'DAZN LaLiga 2'],
        [/D\.?\s*L\.?/gi, 'DAZN LaLiga'],
        [/M\.?\s*L\.?\s*Camp\.?/gi, 'Movistar Liga de Campeones'],
        [/M\.?\s*L\.?/gi, 'Movistar LaLiga'],
        [/M\.?\s*D\.?/gi, 'Movistar Deportes'],
        [/M\.?\s*#/gi, 'Movistar #'],
        [/M\./gi, 'Movistar'],
    ];

    for (const [pattern, replacement] of replacements) {
        expanded = expanded.replace(pattern, replacement);
    }

    return normalizeSpacing(expanded);
};

export const generateTags = (channelName: string) => {
    const tags = new Set<string>();
    const baseName = normalizeSpacing(channelName);
    const baseVariants = new Set<string>([baseName]);

    const noOption = baseName.replace(/\s*-\s*Opción\s*\d*$/i, '').trim();
    if (noOption && noOption !== baseName) {
        baseVariants.add(noOption);
    }

    for (const base of baseVariants) {
        if (!base) {
            continue;
        }

        tags.add(base);
        const expanded = expandAbbreviations(base);
        if (expanded && expanded !== base) {
            tags.add(expanded);
        }

        if (/Opción/i.test(base)) {
            tags.add(base.replace(/Opción/gi, 'Opcion'));
        }

        if (expanded.includes('DAZN LaLiga')) {
            tags.add('DAZN Liga');
            tags.add('DAZN LL');
            tags.add('DAZN La Liga');
            tags.add('DAZNLL');
        }

        if (expanded.includes('DAZN ')) {
            const daznCompact = expanded.replace(/DAZN\s+/g, 'DAZN');
            tags.add(daznCompact);
            tags.add(daznCompact.replace(/\s+/g, ''));
        }

        if (expanded.includes('Movistar ')) {
            tags.add(expanded.replace(/Movistar\s+/g, 'M+ '));
        }
    }

    return [...tags]
        .map((tag) => normalizeSpacing(tag))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
};

const qualitySuffixRegex = /\s+(?:4K|UHD|FHD|HD|SD)?\s*(?:\d{3,4}p)?$/i;

const removeQualitySuffix = (name: string) => {
    return name.replace(qualitySuffixRegex, '').trim() || name;
};

export const transformChannels = (inputData: DataEnvelope<Channel[]>) => {
    const output = new Map<
        string,
        { nombre: string; links: Record<Quality, Set<string>>; tags: Set<string> }
    >();

    for (const channel of inputData.data) {
        const rawName = channel.name?.trim();
        const rawLink = channel.link?.trim();
        if (!rawName || !rawLink) {
            continue;
        }

        const quality = extractQuality(rawName);
        // Remove quality suffix BEFORE normalizing and parsing options
        const nameWithoutQuality = removeQualitySuffix(rawName);
        const name = normalizeSpacing(nameWithoutQuality);
        const optionInfo = parseOptionName(name);
        const groupName = optionInfo?.parentName ?? name;
        const cleanGroupName = groupName;

        const bucket =
            output.get(cleanGroupName) ??
            (() => {
                const entry = {
                    nombre: cleanGroupName,
                    links: {
                        '4k': new Set<string>(),
                        '1080p': new Set<string>(),
                        '720p': new Set<string>(),
                        sd: new Set<string>(),
                        unknown: new Set<string>(),
                    },
                    tags: new Set<string>(generateTags(cleanGroupName)),
                };
                output.set(cleanGroupName, entry);
                return entry;
            })();

        bucket.links[quality].add(rawLink);
        bucket.tags.add(name);

        if (optionInfo) {
            bucket.tags.add(optionInfo.optionName);
        }
    }

    return [...output.values()].map((entry) => ({
        nombre: entry.nombre,
        links: {
            '4k': [...entry.links['4k']].sort(),
            '1080p': [...entry.links['1080p']].sort(),
            '720p': [...entry.links['720p']].sort(),
            sd: [...entry.links.sd].sort(),
            unknown: [...entry.links.unknown].sort(),
        },
        tags: [...entry.tags].sort((a, b) => a.localeCompare(b)),
    }));
};

export const groupChannels = async (
    inputFile = 'channels.json',
    outputFile = 'groupedChannels.json'
) => {
    const inputData = await readJson<DataEnvelope<Channel[]>>(inputFile);
    const transformedChannels = transformChannels(inputData);
    await writeJson(outputFile, transformedChannels);
    return transformedChannels;
};

if (import.meta.main) {
    await groupChannels();
}
