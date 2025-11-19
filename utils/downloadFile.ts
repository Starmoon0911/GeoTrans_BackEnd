import fs from 'fs'
import axios from 'axios'
export default async function downloadFile(fileUrl: string, outputPath: string) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    return new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}