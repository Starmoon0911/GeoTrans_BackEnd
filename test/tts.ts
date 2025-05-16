// import { processTTS } from "../src/agent/tts/speaker";
import { processTaigiTTS } from "../src/agent/tts/hokkien/speaker";
// async function testTTS() {
//      try {
//     const { audioPath, chunks } = await processTTS(
//       "底下有些資料，我們看過就可以明白為什麼？因為他們只做一件事情，就是將所有 TypeScript 的 funcs 在不更動『邏輯』的情況下，全部改寫成 Go 語言。直接了解 go 語言當初被創造出來的原因，那麼，會使用 Go 語言真的就是最佳的考量（這是完全撇開政治、就是技術/成本的最佳考量 XD）。",
//       "test_project",
//     );
//     console.log("合成完成，檔案在：", audioPath);
//     console.log("時間戳：", chunks);
//   } catch (err) {
//     console.error(err);
//   }
// }
// async function testTTS2() {
//    try {
//     const { audioPath, chunks } = await processTTS(
//       "你好，哇哈哈哈哈哈哈哈哈哈哈哈哈",
//       "test_project1"
//     );
//     console.log("合成完成，檔案在：", audioPath);
//     console.log("時間戳：", chunks);
//   } catch (err) {
//     console.error(err);
//   }
// }
// testTTS();
// testTTS2();

async function hokkienTTS() {
    const text = "你好，我是聲音合成測試。";
    const project = "taigi_test";
    const gender = "女聲";
    const accent = "強勢腔（高雄腔）";
    try {
        const { audioPath, chunks } = await processTaigiTTS(text, project, gender, accent);
        console.log("檔案生成於:", audioPath);
        console.table(chunks, ["index", "text", "roman", "start", "end"]);
    } catch (e) {
        console.error("TTS 錯誤：", e);
    }
}
hokkienTTS();