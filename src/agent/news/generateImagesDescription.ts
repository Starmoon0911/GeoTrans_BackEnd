import { DefaultAgent } from "../CreateDefaultAgent"
import fs from 'fs'
import path from "path"
import config from "../../../config"
export default async function generateImagesDescription(images: string) {
    try {
        const { textModel, visionModel } = config.modelConfig as {
            textModel: string,
            visionModel: string,
        }
        const model = new DefaultAgent({ _model: visionModel })
        const prompt = fs.readFileSync(path.join(__dirname, '../prompts/generateImageDesc.txt'), "utf-8")
        console.log('Starting to generate image description...')
        const response = await model.invoke({
            systemPrompt: prompt,
            prompt: '請照系統提示詞執行操作',
            imgUrl: images
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error in generateImagesDescription:", error);
        return;

    }

}