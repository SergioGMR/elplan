import type { IncomingMessage, ServerResponse } from 'node:http';

import app from '../src/app';

export const config = {
    runtime: 'nodejs',
};

const buildUrl = (req: IncomingMessage) => {
    const host = req.headers.host ?? 'localhost';
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto ?? 'https';
    return `${protocol}://${host}${req.url ?? '/'}`;
};

const toRequest = (req: IncomingMessage) => {
    return new Request(buildUrl(req), {
        method: req.method,
        headers: req.headers as HeadersInit,
    });
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const response = await app.fetch(toRequest(req));

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });

    const body = await response.arrayBuffer();
    res.end(Buffer.from(body));
}
