export type Channel = {
    name: string;
    link: string;
};

export type DataEnvelope<T> = {
    data: T;
    updated: number;
};

export type Quality = '4k' | '1080p' | '720p' | 'sd' | 'unknown';

export type QualityLinks = Record<Quality, string[]>;

export const QUALITIES: Quality[] = ['4k', '1080p', '720p', 'sd', 'unknown'];

export const emptyQualityLinks = (): QualityLinks => ({
    '4k': [],
    '1080p': [],
    '720p': [],
    sd: [],
    unknown: [],
});
