import { describe, expect, it } from 'bun:test';

import { extractQuality, generateTags, transformChannels } from '../api/groupChannels';
import type { Channel, DataEnvelope } from '../api/types';

describe('extractQuality', () => {
    it('detects 4k quality', () => {
        expect(extractQuality('DAZN 1 4K')).toBe('4k');
        expect(extractQuality('Channel UHD')).toBe('4k');
    });

    it('detects 1080p quality', () => {
        expect(extractQuality('DAZN 1 1080p')).toBe('1080p');
        expect(extractQuality('DAZN 1 1080')).toBe('1080p');
        expect(extractQuality('Channel FHD')).toBe('1080p');
    });

    it('detects 720p quality', () => {
        expect(extractQuality('DAZN 1 720p')).toBe('720p');
        expect(extractQuality('DAZN 1 720')).toBe('720p');
        expect(extractQuality('Channel HD')).toBe('720p');
    });

    it('detects sd quality', () => {
        expect(extractQuality('DAZN 1 SD')).toBe('sd');
        expect(extractQuality('Channel 480p')).toBe('sd');
    });

    it('returns unknown for no quality', () => {
        expect(extractQuality('DAZN 1')).toBe('unknown');
        expect(extractQuality('Channel Name')).toBe('unknown');
    });

    it('does not confuse UHD with HD', () => {
        expect(extractQuality('Channel UHD')).toBe('4k');
    });
});

describe('transformChannels', () => {
    it('groups opciones and classifies by quality', () => {
        const input: DataEnvelope<Channel[]> = {
            updated: Date.now(),
            data: [
                { name: 'D.L.Opción 2 1080p', link: 'acestream://a' },
                { name: 'D.L.Opción 3 720p', link: 'acestream://b' },
                { name: 'D.L.Opción 2 1080p', link: 'acestream://a' },
                { name: 'DAZN 1 4K', link: 'acestream://c' },
                { name: 'DAZN 1', link: 'acestream://d' },
            ],
        };

        const output = transformChannels(input);
        const dl = output.find((channel) => channel.nombre === 'D.L.');
        const dazn = output.find((channel) => channel.nombre === 'DAZN 1');

        expect(dl).toBeDefined();
        expect(dl?.links['1080p']).toEqual(['acestream://a']);
        expect(dl?.links['720p']).toEqual(['acestream://b']);
        expect(dl?.tags).toContain('DAZN LaLiga');

        expect(dazn).toBeDefined();
        expect(dazn?.links['4k']).toEqual(['acestream://c']);
        expect(dazn?.links.unknown).toEqual(['acestream://d']);
    });

    it('deduplicates links within same quality', () => {
        const input: DataEnvelope<Channel[]> = {
            updated: Date.now(),
            data: [
                { name: 'DAZN 1 1080p', link: 'acestream://a' },
                { name: 'DAZN 1 1080p', link: 'acestream://a' },
                { name: 'DAZN 1 1080p', link: 'acestream://b' },
            ],
        };

        const output = transformChannels(input);
        const dazn = output.find((channel) => channel.nombre === 'DAZN 1');

        expect(dazn?.links['1080p']).toEqual(['acestream://a', 'acestream://b']);
    });

    it('removes quality suffix from channel name', () => {
        const input: DataEnvelope<Channel[]> = {
            updated: Date.now(),
            data: [
                { name: 'DAZN 1 1080p', link: 'acestream://a' },
                { name: 'DAZN 1 720p', link: 'acestream://b' },
                { name: 'DAZN 1 4K', link: 'acestream://c' },
            ],
        };

        const output = transformChannels(input);
        expect(output.length).toBe(1);
        expect(output[0].nombre).toBe('DAZN 1');
        expect(output[0].links['1080p']).toEqual(['acestream://a']);
        expect(output[0].links['720p']).toEqual(['acestream://b']);
        expect(output[0].links['4k']).toEqual(['acestream://c']);
    });
});

describe('generateTags', () => {
    it('expands abbreviations and adds aliases', () => {
        const tags = generateTags('D.L.2');
        expect(tags).toContain('DAZN LaLiga 2');
        expect(tags).toContain('DAZNLL');
        expect(tags).toContain('DAZNLaLiga2');
    });

    it('adds Movistar variants', () => {
        const tags = generateTags('M.L.Camp.');
        expect(tags).toContain('Movistar Liga de Campeones');
        expect(tags).toContain('M+ Liga de Campeones');
    });
});
