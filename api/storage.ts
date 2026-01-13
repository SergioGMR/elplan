import { promises as fs } from 'node:fs';
import path from 'node:path';

const defaultDataDir = path.join(process.cwd(), 'data');

const resolveDataDir = () => {
    return process.env.DATA_DIR
        ? path.resolve(process.env.DATA_DIR)
        : defaultDataDir;
};

export const resolveDataPath = (fileName: string) => {
    return path.join(resolveDataDir(), fileName);
};

export const ensureDataDir = async () => {
    await fs.mkdir(resolveDataDir(), { recursive: true });
};

export const writeJson = async <T>(fileName: string, payload: T) => {
    await ensureDataDir();
    const filePath = resolveDataPath(fileName);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
};

export const readJson = async <T>(fileName: string): Promise<T> => {
    const filePath = resolveDataPath(fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
};

export const readJsonIfExists = async <T>(fileName: string): Promise<T | null> => {
    try {
        return await readJson<T>(fileName);
    } catch (error) {
        const err = error as { code?: string };
        if (err.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
};
