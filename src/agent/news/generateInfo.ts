import { DefaultAgent } from "../CreateDefaultAgent";
import config from "@/config";
import { z } from "zod";
import fs from 'fs'
import path from 'path'
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const NewsAnalysisSchema = z.object({
    category: z.string().describe("新聞的主題分類，例如：地方新聞、環保、經濟、文化、教育等"),
    analysis: z.object({
        summary: z.string().describe("對新聞內容的簡短摘要"),
        keywords: z.array(z.string()).describe("與新聞內容相關的重要關鍵字"),
        sentiment: z.enum(["positive", "neutral", "negative"]).describe("整體語氣：正面、中立或負面"),
        tone: z.string().describe("文章的語調，例如：正式、輕鬆、煽情、客觀等"),
    })
});

export default async function generateInfo(content: string) {
    try {

        const { textModel, visionModel } = config.modelConfig as {
            textModel: string,
            visionModel: string,
        }
        const model = new DefaultAgent({ _model: textModel });
        const systemPrompt = await fs.readFileSync(path.join(__dirname, '../prompts/generateInfo.txt'), "utf-8")
        const response = await model.invoke({
            systemPrompt: systemPrompt,
            prompt: `文章內容:${content}`,
            maxTokens: 500,
            zod: NewsAnalysisSchema
        })
        return response.choices[0].message.content;

    } catch (error) {
        console.error("Error in generateInfo:", error);
        return;
    }
}