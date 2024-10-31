import fs from 'node:fs'
import path from 'node:path'

type Channel = {
    name: string;
    link: string;
};

type InputData = {
    data: Channel[];
    updated: number;
};

type OutputChannel = {
    nombre: string;
    links: string[];
    tags: string[];
};

function transformChannels(inputData: InputData): OutputChannel[] {
    const channels = inputData.data;

    const outputChannels: { [key: string]: OutputChannel } = {};

    channels.forEach((channel) => {
        const name = channel.name.trim();
        const link = channel.link.trim();
        let baseName = name;
        let isOption = false;

        // Detectar si el canal es una opción (contiene "Opción")
        if (name.includes("Opción")) {
            isOption = true;
            // Extraer nombre base antes de "Opción"
            const optionIndex = name.indexOf("Opción");
            baseName = name.substring(0, optionIndex).trim();
            // Asegurar que haya un " - " antes de "Opción"
            if (!baseName.endsWith("-")) {
                baseName = baseName.replace(/\s*-\s*$/, "");
                baseName += " -";
            }
            baseName += " Opción";
        }

        // Manejar canales con números (e.g., "DAZN LaLiga 2")
        const numberMatch = baseName.match(/^(.*?)(\d+)$/);
        if (numberMatch && !isOption) {
            baseName = numberMatch[0].trim();
        }

        // Eliminar puntos sobrantes en nombres como "D.L.Opción 2" -> "D.L. - Opción 2"
        baseName = baseName.replace(/\.(?=\S)/g, ". ");

        // Si es una opción, agrupar bajo el canal principal
        if (isOption) {
            const parentName = baseName.replace(" - Opción", "").trim();
            if (!outputChannels[parentName]) {
                outputChannels[parentName] = {
                    nombre: parentName,
                    links: [],
                    tags: generateTags(parentName),
                };
            }
            outputChannels[parentName].links.push(link);
            // Agregar nombre de la opción a las etiquetas
            outputChannels[parentName].tags.push(name);
        } else {
            // Si el canal ya existe, agregar el enlace
            if (!outputChannels[baseName]) {
                outputChannels[baseName] = {
                    nombre: baseName,
                    links: [],
                    tags: generateTags(baseName),
                };
            }
            outputChannels[baseName].links.push(link);
        }
    });

    // Convertir el objeto outputChannels a un array
    return Object.values(outputChannels);
}

function generateTags(channelName: string): string[] {
    const tags = [channelName];

    // Generar etiquetas adicionales basadas en patrones del nombre del canal
    let baseTag = channelName;

    // Eliminar " - Opción" de las etiquetas
    baseTag = baseTag.replace(" - Opción", "");

    // Reemplazar abreviaturas
    baseTag = baseTag.replace("M.", "Movistar ");
    baseTag = baseTag.replace("D.L.Opción", "DAZN LaLiga - Opción");
    baseTag = baseTag.replace("D.L.2.Opción", "DAZN LaLiga 2 - Opción");
    baseTag = baseTag.replace("D.L.", "DAZN LaLiga ");
    baseTag = baseTag.replace("D.L.2.", "DAZN LaLiga 2 ");
    baseTag = baseTag.replace("D.L", "DAZN LaLiga");
    baseTag = baseTag.replace("D.L.2", "DAZN LaLiga 2");
    baseTag = baseTag.replace("M.L.", "Movistar LaLiga ");
    baseTag = baseTag.replace("M.L.Camp.", "Movistar Liga de Campeones ");
    baseTag = baseTag.replace("M.L.Camp", "Movistar Liga de Campeones");
    baseTag = baseTag.replace("M.D.", "Movistar Deportes ");
    baseTag = baseTag.replace("M.#", "Movistar #");
    baseTag = baseTag.replace("M.", "Movistar ");

    // Agregar baseTag a las etiquetas si es diferente
    if (!tags.includes(baseTag)) {
        tags.push(baseTag.trim());
    }

    // Etiquetas adicionales para patrones conocidos
    if (baseTag.includes("DAZN LaLiga")) {
        tags.push("DAZN Liga", "DAZN LL", "DAZN La Liga", "DAZNLL");
    }
    if (baseTag.includes("DAZN")) {
        tags.push(baseTag.replace("DAZN ", "DAZN"));
    }
    if (baseTag.includes("Movistar")) {
        tags.push(baseTag.replace("Movistar ", "M+ "));
    }

    // Eliminar duplicados y espacios adicionales
    return [...new Set(tags.map((tag) => tag.trim()))];
}

// Función para guardar el resultado en un archivo JSON
function saveToJsonFile(data: any, fileName: string) {
    // Asegurar que la carpeta 'data' existe
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    // Ruta completa del archivo
    const filePath = path.join(dir, fileName);

    // Escribir el archivo JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Archivo guardado en: ${filePath}`);
}

// Función para leer el archivo de entrada 'channels.json'
function readInputData(fileName: string): InputData {
    const filePath = path.join(__dirname, 'data', fileName);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo de entrada no existe: ${filePath}`);
    }

    // Leer el contenido del archivo
    const rawData = fs.readFileSync(filePath, 'utf8');

    // Parsear el contenido JSON
    const inputData: InputData = JSON.parse(rawData);

    return inputData;
}

// Ejecución del script

export default async function groupMain() {
    try {
        // Leer los datos de entrada desde 'data/channels.json'
        const inputData = readInputData('channels.json');

        // Transformar los canales
        const transformedChannels = transformChannels(inputData);

        // Guardar el resultado en un archivo JSON
        saveToJsonFile(transformedChannels, 'groupedChannels.json');
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
    }
}