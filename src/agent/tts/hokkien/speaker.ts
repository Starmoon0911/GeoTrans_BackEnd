import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import safeProjectName from "@/utils/safeProjectName";
import { retry } from "@/utils/retry";

// 新的 API 端點
const TAIGI_TTS_URL = "https://learn-language.tokyo/taigiTTS/taigi-text-to-speech";

export interface ChunkInfo {
    start: number;
    end: number;
    index: number;
    text: string;
    roman: string; // 雖然新 API 不回傳羅馬音，但保留此欄位以維持結構一致性
}

interface TextToken {
    text: string;
    tts: boolean;
}

function tokenizeByTTS(text: string): TextToken[] {
    const tokens: TextToken[] = [];
    const parts = text.split(/(<\/?NoTTSHere>)/g).filter(Boolean);

    let isInsideNoTTS = false;
    for (const part of parts) {
        if (part === '<NoTTSHere>') {
            isInsideNoTTS = true;
            continue;
        }
        if (part === '</NoTTSHere>') {
            isInsideNoTTS = false;
            continue;
        }

        if (part.trim()) {
            tokens.push({ text: part, tts: !isInsideNoTTS });
        }
    }
    return tokens;
}

function segmentTtsText(text: string): string[] {
    return text
        .replace(/([，。．！!？?])/g, "$1\n")
        .replace(/(\.|\?|!)(?=\s|$)/g, "$1\n")
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0 && /[a-zA-Z\u4e00-\u9fff]/.test(s));
}

// 將性別和腔調對應到新 API 的模型
function getModel(
    gender: "女聲" | "男聲",
    accent: "強勢腔（高雄腔）" | "次強勢腔（台北腔）"
): string {
    if (gender === "女聲") {
        return accent === "強勢腔（高雄腔）" ? "model6" : "model2";
    } else { // 男聲
        return accent === "強勢腔（高雄腔）" ? "model1" : "model3";
    }
}

// 新的合成函式，直接從文本合成音訊
async function synthesizeTaigi(
    text: string,
    index: number,
    tempDir: string,
    model: string,
): Promise<string> {
    const getAudio = async (): Promise<string> => {
        // --- 步驟 1: POST 請求，獲取音訊 URL ---
        const postResponse = await axios.post(
            TAIGI_TTS_URL,
            { text, model },
            {
                headers: {
                    "accept": "application/json", // 我們期望得到 JSON
                    "content-type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                    "Referer": "https://learn-language.tokyo/zh-TW/taiwanese-taigi-tts",
                    "Origin": "https://learn-language.tokyo",
                },
                // 這次我們期望的回應是 JSON，所以不要設定 responseType
            }
        );

        // 檢查回傳的是否是有效的 JSON 且包含 audio_url
        const responseData = postResponse.data;
        if (!responseData || typeof responseData.audio_url !== 'string') {
            console.error("API 未回傳有效的 audio_url。收到的回應:", responseData);
            throw new Error("API 未回傳有效的 audio_url");
        }

        const audioUrl = responseData.audio_url;
        console.log(`[TTS] 成功獲取音訊 URL: ${audioUrl}`);

        // --- 步驟 2: GET 請求，從獲取的 URL 下載音訊資料 ---
        const audioResponse = await axios.get(audioUrl, {
            // 這次請求的是音訊檔案，所以 responseType 必須是 arraybuffer
            responseType: 'arraybuffer'
        });

        // 檢查下載的資料是否有效
        if (!audioResponse.data || audioResponse.data.byteLength < 100) {
            throw new Error(`從 ${audioUrl} 下載的音訊數據無效或為空`);
        }

        const filePath = path.join(tempDir, `chunk_${index}.wav`);
        fs.writeFileSync(filePath, audioResponse.data);
        return filePath;
    };

    // 重試機制對整個兩步驟流程生效
    return retry(getAudio, 5, 10000);
}

function getAudioDuration(file: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file, (err, data) => {
            if (err || !data?.format?.duration) {
                return reject(err || new Error(`無法獲取音訊時長: ${file}`));
            }
            resolve(data.format.duration);
        });
    });
}

async function assembleChunks(
    chunkPaths: string[],
    outputPath: string,
    tempDir: string
): Promise<Pick<ChunkInfo, "start" | "end" | "index">[]> {
    const listPath = path.join(tempDir, "tts_files.txt");
    const listContent = chunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(listPath, listContent, "utf-8");

    const stamps: { start: number; end: number; index: number }[] = [];
    let totalDuration = 0;
    for (let i = 0; i < chunkPaths.length; i++) {
        const duration = await getAudioDuration(chunkPaths[i]);
        stamps.push({ start: totalDuration, end: totalDuration + duration, index: i });
        totalDuration += duration;
    }

    await new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(listPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .outputOptions("-c", "copy")
            .save(outputPath)
            .on("end", resolve)
            .on("error", reject);
    });

    return stamps;
}

function writeIndexFile(chunks: ChunkInfo[], outDir: string): void {
    const p = path.join(outDir, "index_taigi.json");
    fs.writeFileSync(p, JSON.stringify(chunks, null, 2), "utf-8");
}

export async function processTaigiTTS(
    text: string,
    project: string,
    gender: "女聲" | "男聲",
    accent: "強勢腔（高雄腔）" | "次強勢腔（台北腔）"
): Promise<{ audioPath: string; chunks: ChunkInfo[] }> {
    const safeName = safeProjectName(project);
    const tokens = tokenizeByTTS(text);

    const tempDir = path.resolve("temp", `${safeName}_${Date.now()}_taigi`);
    fs.mkdirSync(tempDir, { recursive: true });

    const audioChunkPaths: string[] = [];
    const allChunksMeta: Omit<ChunkInfo, 'start' | 'end'>[] = [];
    let globalIndex = 0;
    let audioFileIndex = 0;

    // 根據使用者的選擇獲取對應的模型
    const model = getModel(gender, accent);

    for (const token of tokens) {
        // 判斷此文本片段是否需要轉換為語音
        if (token.tts) {
            const segments = segmentTtsText(token.text);
            for (const segment of segments) {
                let success = false;
                try {
                    // 直接使用新的合成函式
                    const filePath = await synthesizeTaigi(segment, audioFileIndex, tempDir, model);
                    audioChunkPaths.push(filePath);
                    // 標記此片段已成功合成音訊
                    allChunksMeta.push({ index: globalIndex, text: segment, roman: "synthesized" });
                    audioFileIndex++;
                    success = true;
                } catch (err) {
                    console.warn(`跳過TTS失敗的句子: "${segment}"`, err);
                    allChunksMeta.push({ index: globalIndex, text: segment, roman: "" });
                }
                globalIndex++;
            }
        } else {
            // 對於標記為 <NoTTSHere> 的部分，直接加入，不進行語音合成
            allChunksMeta.push({ index: globalIndex, text: token.text, roman: "" });
            globalIndex++;
        }
    }

    // 如果沒有任何成功的音訊片段
    if (audioChunkPaths.length === 0) {
        console.log("沒有成功合成任何音訊片段，生成一個純文本的 index.json。");
        fs.rmSync(tempDir, { recursive: true, force: true });

        const outputDir = path.join("wav", `${safeName}_taigi`);
        fs.mkdirSync(outputDir, { recursive: true });
        const textOnlyChunks = allChunksMeta.map(meta => ({ ...meta, roman: "", start: 0, end: 0 }));
        writeIndexFile(textOnlyChunks, outputDir);
        return { audioPath: "", chunks: textOnlyChunks };
    }

    // 組合音訊並生成最終檔案
    const outputDir = path.join("wav", safeName);
    fs.mkdirSync(outputDir, { recursive: true });
    const finalAudioPath = path.join(outputDir, "audio_taigi.wav");

    const audioTimeStamps = await assembleChunks(audioChunkPaths, finalAudioPath, tempDir);

    const finalChunks: ChunkInfo[] = [];
    let audioStampIndex = 0;
    for (const meta of allChunksMeta) {
        // 透過 roman 欄位的標記判斷是否有對應的音訊
        if (meta.roman === "synthesized") {
            const stamp = audioTimeStamps[audioStampIndex];
            if (stamp) {
                finalChunks.push({ ...meta, roman: "", start: stamp.start, end: stamp.end });
                audioStampIndex++;
            } else {
                finalChunks.push({ ...meta, roman: "", start: 0, end: 0 });
            }
        } else {
            const prevEnd = finalChunks.length > 0 ? finalChunks[finalChunks.length - 1].end : 0;
            finalChunks.push({ ...meta, roman: "", start: prevEnd, end: prevEnd });
        }
    }

    // 清理暫存檔案並寫入 index.json
    fs.rmSync(tempDir, { recursive: true, force: true });
    writeIndexFile(finalChunks, outputDir);
    console.log("處理完成")
    return { audioPath: safeName, chunks: finalChunks };
}