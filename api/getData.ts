import { promises as fs } from 'fs';
import { join } from 'path';

interface DataResponse {
    [key: string]: any;
}

interface ErrorResponse {
    error: string;
}

export default async function handler(req: any, res: any) {
    try {
        // Ubicación del archivo data.json (ajustar si es necesario)
        const filePath = join(process.cwd(), 'data', 'groupedChannels.json');

        // Leer el contenido del archivo
        const data = JSON.parse(await fs.readFile(filePath, 'utf8')) as DataResponse;

        // Configurar encabezados CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Enviar el contenido del archivo como respuesta JSON
        res.status(200).json(data);
    } catch (error: unknown) {
        console.error("Error leyendo el archivo groupedChannels.json:", error);
        res.status(500).json({ error: 'No se pudo leer el archivo de datos' });
    }
}