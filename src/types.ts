export type Channel = {
    name: string;
    link: string;
};

export type DataEnvelope<T> = {
    data: T;
    updated: number;
};
