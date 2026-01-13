/**
 * Elplan AceStream API - Hono Application for Vercel
 *
 * This file is SELF-CONTAINED for Vercel deployment.
 * It does not import other .ts files from the project to avoid module resolution issues.
 *
 * Endpoints:
 * - GET /api          - API info
 * - GET /api/health   - Health check
 * - GET /api/channels - Channels with logos and AceStream links
 */

import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ============================================================
// JSON DATA IMPORTS
// ============================================================

import channelsRaw from '../data/channels.json' with { type: 'json' };
import groupedChannelsRaw from '../data/groupedChannels.json' with { type: 'json' };

// ============================================================
// TYPES
// ============================================================

type Channel = {
    name: string;
    link: string;
};

type DataEnvelope<T> = {
    data: T;
    updated: number;
};

type OutputChannel = {
    nombre: string;
    links: string[];
    tags: string[];
};

type ChannelLogo = {
    logo: string | null;
    logoExternal: string | null;
};

type ApiChannel = {
    name: string;
    logo: string | null;
    logoExternal: string | null;
    links: string[];
};

// Cast imported JSON to proper types
const channelsData = channelsRaw as DataEnvelope<Channel[]>;
const groupedChannelsData = groupedChannelsRaw as OutputChannel[];

// ============================================================
// CHANNEL LOGOS
// ============================================================

const baseLogo = (logoExternal: string): ChannelLogo => ({
    logo: null,
    logoExternal,
});

const logos = new Map<string, ChannelLogo>([
    ['DAZN', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/dazn-es.png')],
    ['DAZN 1', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/dazn-es.png')],
    ['DAZN 2', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/dazn-2-es.png')],
    ['DAZN 3', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/dazn-3-es.png')],
    ['DAZN 4', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/dazn-es.png')],
    ['Eurosport 1', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/eurosport-1-es.png')],
    ['Eurosport 2', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/eurosport-2-es.png')],
    ['La 1', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/tve-1-es.png')],
    ['La 2', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/tve-2-es.png')],
    ['Antena 3', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/antena-3-es.png')],
    ['Telecinco', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/telecinco-es.png')],
    ['Cuatro', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/cuatro-es.png')],
    ['La Sexta', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/lasexta-es.png')],
    ['Gol Play', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/gol-play-es.png')],
    ['M+ LaLiga TV', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/laliga-tv-por-movistar-plus-es.png')],
    ['M+ LaLiga TV 2', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/laliga-tv-2-por-movistar-plus-es.png')],
    ['M+ LaLiga TV 3', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/laliga-tv-3-por-movistar-plus-es.png')],
    ['M+ LaLiga TV 4', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/laliga-tv-4-por-movistar-plus-es.png')],
    ['M+ Vamos', baseLogo('https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/vamos-por-movistar-plus-es.png')],
]);

const fallbackMovistar = baseLogo(
    'https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/spain/movistar-plus-es.png'
);

const fallbackDazn = logos.get('DAZN') ?? { logo: null, logoExternal: null };

const getFallbackLogo = (name: string): ChannelLogo | null => {
    if (/^M\+ /i.test(name) || /^Movistar/i.test(name)) {
        return fallbackMovistar;
    }
    if (/^DAZN\b/i.test(name)) {
        return fallbackDazn;
    }
    return null;
};

const resolveChannelLogo = (name: string): ChannelLogo => {
    const exact = logos.get(name);
    if (exact) {
        return exact;
    }
    return getFallbackLogo(name) ?? { logo: null, logoExternal: null };
};

// ============================================================
// GROUP CHANNELS TRANSFORMATION
// ============================================================

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

const generateTags = (channelName: string) => {
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

const transformChannels = (inputData: DataEnvelope<Channel[]>): OutputChannel[] => {
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

// ============================================================
// API CHANNELS FORMATTING
// ============================================================

const qualitySuffix = /\s+(?:4K|UHD|FHD|HD|SD)?\s*(?:\d{3,4}p)?$/i;

const normalizeChannelName = (name: string) => {
    const cleaned = name.replace(qualitySuffix, '').trim();
    return cleaned || name.trim();
};

const toApiChannels = (channels: OutputChannel[]): ApiChannel[] => {
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

// ============================================================
// DATA LOADING
// ============================================================

const loadChannelData = () => {
    const updated = channelsData?.updated ?? null;

    // Prefer pre-grouped data if available
    if (groupedChannelsData && Array.isArray(groupedChannelsData) && groupedChannelsData.length > 0) {
        return { grouped: groupedChannelsData, updated };
    }

    // Fall back to transforming raw channels
    if (channelsData?.data) {
        return { grouped: transformChannels(channelsData), updated };
    }

    return { grouped: null, updated };
};

// ============================================================
// HONO APP
// ============================================================

const app = new Hono().basePath('/api');

const corsConfig = {
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
};

app.use('/*', cors(corsConfig));

const endpoints = {
    'GET /api': 'API info',
    'GET /api/health': 'Service status',
    'GET /api/channels': 'Channels with logos and AceStream links',
};

const apiMeta = {
    name: 'Elplan AceStream API',
    version: '1.0.0',
    description: 'API de canales AceStream',
    source: 'aceid.vercel.app',
    repository: null,
};

const toIso = (value: number | null) => (value ? new Date(value).toISOString() : null);

// GET /api - API info
app.get('/', (c) => {
    const channelData = loadChannelData();
    return c.json({
        ...apiMeta,
        endpoints,
        lastUpdated: toIso(channelData.updated),
    });
});

// GET /api/health - Health check
app.get('/health', (c) => {
    const channelData = loadChannelData();
    const totalChannels = channelData.grouped ? toApiChannels(channelData.grouped).length : 0;

    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        data: {
            totalChannels,
        },
    });
});

// GET /api/channels - Channels with logos
app.get('/channels', (c) => {
    const channelData = loadChannelData();
    if (!channelData.grouped) {
        return c.json({ error: 'No data file found. Run the refresh pipeline first.' }, 404);
    }

    const channels = toApiChannels(channelData.grouped);
    return c.json({
        channels,
        totalChannels: channels.length,
        lastUpdated: toIso(channelData.updated),
    });
});

// 404 handler
app.notFound((c) => {
    return c.json(
        {
            error: 'Not Found',
            message: `Endpoint ${c.req.path} not found`,
            availableEndpoints: ['/api', '/api/health', '/api/channels'],
        },
        404
    );
});

// Error handler
app.onError((err, c) => {
    console.error(`Error: ${err.message}`);
    return c.json(
        {
            error: 'Internal Server Error',
            message: err.message,
        },
        500
    );
});

// Export for Vercel
export default handle(app);
