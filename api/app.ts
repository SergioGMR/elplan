import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { readJsonIfExists } from './storage';
import { toApiChannels } from './apiChannels';
import { transformChannels } from './groupChannels';
import type { OutputChannel } from './groupChannels';
import type { Channel, DataEnvelope } from './types';

const app = new Hono();

const corsConfig = {
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
};

app.use('/api', cors(corsConfig));
app.use('/api/*', cors(corsConfig));

const endpoints = {
    'GET /api': 'Informacion de la API',
    'GET /api/health': 'Estado del servicio',
    'GET /api/channels': 'Canales con logos y enlaces AceStream',
};

const apiMeta = {
    name: process.env.API_NAME ?? 'Elplan AceStream API',
    version: process.env.API_VERSION ?? '1.0.0',
    description: process.env.API_DESCRIPTION ?? 'API de canales AceStream',
    source: process.env.API_SOURCE ?? 'aceid.vercel.app',
    repository: process.env.API_REPOSITORY ?? null,
};

const toIso = (value: number | null) => (value ? new Date(value).toISOString() : null);

const loadChannelData = async () => {
    const [envelope, grouped] = await Promise.all([
        readJsonIfExists<DataEnvelope<Channel[]>>('channels.json'),
        readJsonIfExists<OutputChannel[]>('groupedChannels.json'),
    ]);

    const updated = envelope?.updated ?? null;

    if (grouped) {
        return { grouped, updated };
    }

    if (envelope) {
        return { grouped: transformChannels(envelope), updated };
    }

    return { grouped: null, updated };
};

const dataMissingMessage = 'No data file found. Run the refresh pipeline first.';

app.get('/', (c) => {
    return c.json({
        ok: true,
        api: '/api',
    });
});

app.get('/api', async (c) => {
    const channelData = await loadChannelData();
    return c.json({
        ...apiMeta,
        endpoints,
        lastUpdated: toIso(channelData.updated),
    });
});

app.get('/api/health', async (c) => {
    const channelData = await loadChannelData();
    const totalChannels = channelData.grouped ? toApiChannels(channelData.grouped).length : 0;

    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        data: {
            totalChannels,
        },
    });
});

app.get('/api/channels', async (c) => {
    const channelData = await loadChannelData();
    if (!channelData.grouped) {
        return c.json({ error: dataMissingMessage }, 404);
    }

    const channels = toApiChannels(channelData.grouped);
    return c.json({
        channels,
        totalChannels: channels.length,
        lastUpdated: toIso(channelData.updated),
    });
});

export default app;
