import { describe, expect, it } from 'bun:test';

import { generateTags, transformChannels } from '../api/groupChannels';
import type { Channel, DataEnvelope } from '../api/types';

describe('transformChannels', () => {
    it('groups opciones and dedupes links', () => {
        const input: DataEnvelope<Channel[]> = {
            updated: Date.now(),
            data: [
                { name: 'D.L.Opción 2', link: 'acestream://a' },
                { name: 'D.L.Opción 3', link: 'acestream://b' },
                { name: 'D.L.Opción 2', link: 'acestream://a' },
                { name: 'DAZN 1', link: 'acestream://c' },
            ],
        };

        const output = transformChannels(input);
        const dl = output.find((channel) => channel.nombre === 'D.L.');
        const dazn = output.find((channel) => channel.nombre === 'DAZN 1');

        expect(dl).toBeDefined();
        expect(dl?.links).toEqual(['acestream://a', 'acestream://b']);
        expect(dl?.tags).toContain('DAZN LaLiga');

        expect(dazn).toBeDefined();
        expect(dazn?.links).toEqual(['acestream://c']);
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
