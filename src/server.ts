import app from '../api/app';
import { refreshData } from './pipeline';

const args = new Set(process.argv.slice(2));
const refreshArg = args.has('--refresh')
    ? true
    : args.has('--no-refresh')
      ? false
      : undefined;
const refreshEnv = process.env.REFRESH_ON_START;
const shouldRefresh =
    refreshArg ??
    (refreshEnv ? refreshEnv === 'true' || refreshEnv === '1' : false);

if (shouldRefresh) {
    const saveRaw = args.has('--raw');
    const headless = !args.has('--headed');
    await refreshData({ saveRaw, headless });
}

if (typeof Bun === 'undefined') {
    throw new Error('Bun runtime required to start the server.');
}

const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? '0.0.0.0';

Bun.serve({
    fetch: app.fetch,
    port,
    hostname,
});

console.log(`Hono server listening on http://${hostname}:${port}`);
