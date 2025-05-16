import { DefaultAgent } from "../CreateDefaultAgent";
import fs from 'fs'
import path from 'path'
import config from "../../../config";

export default async function generateContent(content: string, images: object[]) {
    const { textModel, visionModel } = config.modelConfig as {
        textModel: string,
        visionModel: string,
    }
    const model = new DefaultAgent({ _model: visionModel })
    const prompt = fs.readFileSync(path.join(__dirname, '../prompts/generateContent.txt'), "utf-8")
    console.log('Starting to generate content...')
    console.log(JSON.stringify(images))
    const response = await model.invoke({
        systemPrompt: prompt,
        prompt: `這篇文章元內容是:${content}\n這篇文章包含的圖片有${JSON.stringify(images)}\n請照系統提示詞執行操作`,
    });
    return response;
}