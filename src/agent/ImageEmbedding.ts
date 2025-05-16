import * as ort from 'onnxruntime-node';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

ort.env.wasm.numThreads = 1;

let session: ort.InferenceSession | null = null;

async function init() {
    if (!session) {
        const modelPath = path.resolve(process.cwd(), 'models/openai_clip.onnx');


        if (!fs.existsSync(modelPath)) {
            throw new Error(`Model file not found at path: ${modelPath}`);
        }

        console.log('Loading model...');
        const session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['cpu']
        });

        console.log('Model loaded.');
    }
    return session;
}

export default async function GetImageEmbedding(imageUrl: string): Promise<Float32Array> {
    const session = await init();

    const img = await loadImage(imageUrl);
    const canvas = createCanvas(224, 224);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 224, 224);

    const imageData = ctx.getImageData(0, 0, 224, 224);
    const data = imageData.data;
    const floatData = new Float32Array(3 * 224 * 224);
    const [meanR, meanG, meanB] = [0.48145466, 0.4578275, 0.40821073];
    const [stdR, stdG, stdB] = [0.26862954, 0.26130258, 0.27577711];

    for (let i = 0; i < data.length; i += 4) {
        const r = (data[i] / 255 - meanR) / stdR;
        const g = (data[i + 1] / 255 - meanG) / stdG;
        const b = (data[i + 2] / 255 - meanB) / stdB;
        const idx = i / 4;
        floatData[idx] = r;
        floatData[224 * 224 + idx] = g;
        floatData[2 * 224 * 224 + idx] = b;
    }

    const tensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
    const inputName = session.inputNames[0];
    const feeds: Record<string, ort.Tensor> = { [inputName]: tensor };
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];

    return results[outputName].data as Float32Array;
}
