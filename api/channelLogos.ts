export type ChannelLogo = {
    logo: string | null;
    logoExternal: string | null;
};

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

export const resolveChannelLogo = (name: string): ChannelLogo => {
    const exact = logos.get(name);
    if (exact) {
        return exact;
    }
    return getFallbackLogo(name) ?? { logo: null, logoExternal: null };
};
