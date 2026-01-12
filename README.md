# elplan

Scraper + API Hono para canales AceStream. Simple, rapido y listo para Vercel.

## Features

- Scraper Playwright (Firefox) con dedupe y normalizacion.
- API Hono con respuestas tipo epg-sports.
- Datos versionados en `data/` para deploy directo en Vercel.
- GitHub Action diaria que refresca los JSON.

## Quickstart

```bash
bun install
bunx playwright install chromium
```

```bash
# Scrapea + agrupa + levanta el API
bun run dev
```

## Comandos

```bash
# Solo API (sin refrescar datos)
bun run start

# Solo refresco de datos (scrape + group)
bun run refresh

# Utilidades
bun run scrape
bun run group
bun test
```

## API (estilo epg-sports)

- `GET /api`: metadata basica y endpoints
- `GET /api/health`: estado del servicio
- `GET /api/channels`: canales con logos y links AceStream

## Deploy en Vercel

- Entrypoints serverless: `api/index.ts` y `api/[...path].ts` (Node runtime).
- La API lee `data/channels.json` y `data/groupedChannels.json` generados por el scraper.
- Cada push a `main` redeploya Vercel con los datos actualizados.

## Automatizacion

GitHub Action diaria en `.github/workflows/daily-scrape.yml`:

- Cachea Bun y Playwright para ejecuciones rapidas.
- Ejecuta `bun run refresh`.
- Hace commit de los JSON si hubo cambios.

## Configuracion

- `PORT`: puerto del servidor (default `3000`)
- `HOST`: host del servidor (default `0.0.0.0`)
- `DATA_DIR`: carpeta de datos (default `./data`)
- `HEADLESS`: `false` para abrir el browser en scrape
- `SAVE_RAW`: `true` para guardar `rawChannels.json`
- `SCRAPE_TIMEOUT_MS`: timeout del scrape
- `REFRESH_ON_START`: `true`/`1` para refrescar al arrancar
- `SCRAPE_USER_AGENT`: user-agent personalizado para el scraper
- `SCRAPE_LOCALE`: locale del navegador (default `es-ES`)
- `API_NAME`: nombre mostrado en `GET /api`
- `API_VERSION`: version mostrada en `GET /api`
- `API_DESCRIPTION`: descripcion mostrada en `GET /api`
- `API_SOURCE`: fuente mostrada en `GET /api`
- `API_REPOSITORY`: repositorio mostrado en `GET /api`
