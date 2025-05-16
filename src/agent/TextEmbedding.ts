import { DefaultAgent } from './CreateDefaultAgent'
import { OpenAI } from 'openai';
import config from '../../config';
const { modelConfig } = config;

export default async function GetTextEmbedding(text) {
    const model = new OpenAI({
        apiKey: modelConfig.apikey,
        baseURL: modelConfig.base_url,
    })
    const embedding = await model.embeddings.create({
        model: modelConfig.embeddingModel,
        input: text,
    })
    return embedding;
} 

