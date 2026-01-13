# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Elplan is an AceStream channel scraper and API built with Hono, designed for Spanish sports broadcasting channels. It scrapes channel data from aceid.vercel.app, groups/normalizes channels, and serves them via a REST API deployed on Vercel.

## Commands

```bash
# Install dependencies
bun install
bunx playwright install chromium

# Development - scrape + group + start API server
bun run dev

# Start API server only (uses existing data)
bun run start

# Refresh data only (scrape + group)
bun run refresh

# Individual steps
bun run scrape    # Run Playwright scraper only
bun run group     # Group existing channel data only

# Run tests
bun test
```

## Architecture

### Entry Points
- **Development**: `src/server.ts` - Bun server that optionally refreshes data on start
- **Vercel Production**: `api/index.ts` - Self-contained serverless handler (does not import other modules to avoid Vercel resolution issues)

### Data Pipeline
```
scrape.ts → channels.json → groupChannels.ts → groupedChannels.json → apiChannels.ts → API response
```

1. **Scraping** (`src/scrape.ts`): Playwright scrapes aceid.vercel.app, extracts channel names + AceStream links, deduplicates, saves to `data/channels.json`
2. **Grouping** (`api/groupChannels.ts`): Groups "Opción N" variants, normalizes names (removes quality suffixes like 1080p/4K), generates search tags, saves to `data/groupedChannels.json`
3. **API Formatting** (`api/apiChannels.ts`): Enriches with logos, deduplicates links, sorts alphabetically

### Key Files
- `api/index.ts` - Vercel handler (self-contained, preferred for production)
- `api/app.ts` - Hono app for local development
- `api/groupChannels.ts` - Channel grouping and tag generation logic
- `api/channelLogos.ts` - Static logo mapping to tv-logo GitHub CDN
- `api/types.ts` - Shared TypeScript types (`Channel`, `DataEnvelope`)
- `api/storage.ts` - JSON file I/O utilities

### API Endpoints
- `GET /api` - API metadata and endpoints list
- `GET /api/health` - Service status with total channel count
- `GET /api/channels` - Channels with logos and AceStream links

### Data Files (committed to repo)
- `data/channels.json` - Raw scraped channels with timestamp
- `data/groupedChannels.json` - Grouped/tagged channels (preferred by API)

## Important Patterns

### Vercel Self-Contained Handler
`api/index.ts` duplicates logic from other modules because Vercel serverless has module resolution issues. When modifying API logic, update both `api/index.ts` and `api/app.ts`.

### Tag Generation
The grouping system generates multiple tag variants for search:
- Expands abbreviations: D.L. → DAZN LaLiga, M.L. → Movistar LaLiga
- Creates compact forms: DAZNLL, DAZNLaLiga
- Handles Movistar variants: M+, Movistar

### Logo Resolution
Logos use a fallback strategy in `channelLogos.ts`:
1. Exact channel name match
2. Pattern match (M+/Movistar → Movistar+ logo, DAZN* → DAZN logo)
3. Default null

## GitHub Actions

Daily scrape runs at 00:01 UTC via `.github/workflows/daily-scrape.yml`:
- Executes `bun run refresh`
- Commits updated JSON files if changed
- Pushes to main (triggers Vercel redeploy)
