import type { Channel, DataEnvelope } from './types';
import { readJson, writeJson } from './storage';

export type OutputChannel = {
    nombre: string;
    links: string[];
    tags: string[];
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

export const transformChannels = (inputData: DataEnvelope<Channel[]>) => {
    const output = new Map<
        string,
        { nombre: string; links: Set<string>; tags: Set<string> }
    >();

    for (const channel of inputData.data) {
        const rawName = channel.name?.trim();
        const rawLink = channel.link?.trim();
        if (!rawName || !rawLink) {
            continue;
        }

        const name = normalizeSpacing(rawName);
        const optionInfo = parseOptionName(name);
        const groupName = optionInfo?.parentName ?? name;
        const bucket =
            output.get(groupName) ??
            (() => {
                const entry = {
                    nombre: groupName,
                    links: new Set<string>(),
                    tags: new Set<string>(generateTags(groupName)),
                };
                output.set(groupName, entry);
                return entry;
            })();

        bucket.links.add(rawLink);
        bucket.tags.add(name);

        if (optionInfo) {
            bucket.tags.add(optionInfo.optionName);
        }
    }

    return [...output.values()].map((entry) => ({
        nombre: entry.nombre,
        links: [...entry.links].sort(),
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
