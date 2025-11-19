// D:\code\geoTrans_backEnd\test\tts.ts

import { processTTS } from "@src/agent/tts/speaker";
import {processTaigiTTS} from "@src/agent/tts/hokkien/speaker";

async function test() {

    const ai_content = "你好世界";
    const projectName = "test";
       try {
        const result =  await processTaigiTTS(ai_content, projectName, "女聲", "強勢腔（高雄腔）");
    } catch (error: any) {
        if (error.response?.data) {
            const errText = error.response.data.toString("utf-8"); // Buffer 轉文字
            try {
                const errJson = JSON.parse(errText);
                console.error("伺服器回傳錯誤訊息:", errJson);
            } catch {
                console.error("伺服器回傳非 JSON 格式:", errText);
            }
        } else {
            console.error("發生未知錯誤:", error);
        }
    }

}

test();