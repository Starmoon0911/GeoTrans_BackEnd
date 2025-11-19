import { DefaultAgent } from './CreateDefaultAgent'
import { OpenAI } from 'openai';
import config from '../../config';
const { modelConfig } = config;

export default async function GetTextEmbedding(text) {
    try {
        const model = new OpenAI({
            apiKey: modelConfig.apikey,
            baseURL: modelConfig.base_url,
        })
        const embedding = await model.embeddings.create({
            model: modelConfig.embeddingModel,
            input: text,
        })
        return embedding.data[0].embedding;
    } catch (error) {
        console.error("Error in GetTextEmbedding:", error);
        return;
    }

}

