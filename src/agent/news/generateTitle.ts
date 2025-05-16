import { DefaultAgent } from "../CreateDefaultAgent";
import config from "../../../config";
import fs from 'fs'
import path from 'path'
export default async function generateTitle(content: string, originTitle: string) {
    const { textModel, visionModel } = config.modelConfig as {
        textModel: string,
        visionModel: string,
    }
    const model = new DefaultAgent({ _model: textModel });
    const systemPrompt = await fs.readFileSync(path.join(__dirname, '../prompts/generateTitle.txt'), "utf-8")
    const response = await model.invoke({
        systemPrompt: systemPrompt,
        prompt: `原標題:${originTitle}。文章內容:${content}`,
        maxTokens:500
    })
    return response;
}
