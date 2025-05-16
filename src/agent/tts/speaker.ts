// src/agent/tts/speaker.ts
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const absoluteRefAudioPath = path.resolve(__dirname, "ref_audio.wav");
if (!fs.existsSync(absoluteRefAudioPath)) {
  throw new Error(`參考音訊檔案不存在: ${absoluteRefAudioPath}`);
}

export interface ChunkInfo {
  start: number;
  end: number;
  index: number;
  text: string;
}

export async function segmentText(text: string): Promise<string[]> {
  return text
    .replace(/([，。．！!？?])/g, "$1\n")   // 中標點
    .replace(/(\.|\?|!)(?=\s|$)/g, "$1\n") // 英標點
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// 修改：多傳一個 tempDir 參數
export async function synthesizeChunk(
  text: string,
  index: number,
  tempDir: string
): Promise<string> {
  const res = await axios.post(
    "http://127.0.0.1:9880/tts",
    {
      text,
      text_lang: "zh",
      ref_audio_path: absoluteRefAudioPath,
      prompt_lang: "zh",
      prompt_text:
        "隨著深度學習的發展，自然語言處理 (Natural Language Processing，NLP) 技術越趨成熟",
      text_split_method: "cut0",
      streaming_mode: false,
    },
    { responseType: "arraybuffer" }
  );

  const filePath = path.join(tempDir, `chunk_${index}.wav`);
  fs.writeFileSync(filePath, res.data);
  return filePath;
}

// 同樣多傳 tempDir
export async function assembleChunks(
  chunkPaths: string[],
  outputPath: string,
  tempDir: string
): Promise<{ start: number; end: number; index: number }[]> {
  const listPath = path.join(tempDir, "tts_files.txt");
  // 若不存在就創建一個空檔
  if (!fs.existsSync(listPath)) {
    fs.writeFileSync(listPath, "", "utf-8");
  }

  // 產生 concat list
  const listContent = chunkPaths.map(p => `file '${p}'`).join("\n");
  fs.writeFileSync(listPath, listContent, "utf-8");

  // 計算時間戳
  let total = 0;
  const timestamps: { start: number; end: number; index: number }[] = [];
  for (let i = 0; i < chunkPaths.length; i++) {
    const p = chunkPaths[i];
    if (!fs.existsSync(p)) {
      throw new Error(`找不到音訊檔 ${p}`);
    }
    const dur = await getAudioDuration(p);
    timestamps.push({ start: total, end: total + dur, index: i });
    total += dur;
  }

  // ffmpeg concat
  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions("-f", "concat", "-safe", "0")
      .outputOptions("-c", "copy")
      .save(outputPath)
      .on("end", () => resolve())
      .on("error", err => reject(err));
  });

  return timestamps;
}

function getAudioDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (_err, data) => {
      if (!data || !data.format) {
        return reject(new Error(`ffprobe 無法取得檔案資訊: ${file}`));
      }
      resolve(data.format.duration ?? 0);
    });
  });
}

export function writeIndexFile(chunks: ChunkInfo[], outputDir: string) {
  const jsonPath = path.join(outputDir, "index.json");
  fs.writeFileSync(jsonPath, JSON.stringify(chunks, null, 2), "utf-8");
}

export async function processTTS(
  text: string,
  projectName: string
): Promise<{ audioPath: string; chunks: ChunkInfo[] }> {
  // 1. 切句
  const segments = await segmentText(text);

  // 2. 建立專屬 temp 目錄
  const tempDir = path.resolve("temp", `${projectName}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // 3. 逐句合成
  const chunkPaths: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const p = await synthesizeChunk(segments[i], i, tempDir);
    chunkPaths.push(p);
  }

  // 4. 建立輸出目錄
  const outputDir = path.resolve("wav", projectName);
  fs.mkdirSync(outputDir, { recursive: true });
  const finalAudio = path.join(outputDir, "audio.wav");

  // 5. 拼接 & 取得時間戳
  const raw = await assembleChunks(chunkPaths, finalAudio, tempDir);

  // 6. 帶文字的時間戳
  const chunksInfo: ChunkInfo[] = raw.map(ts => ({
    ...ts,
    text: segments[ts.index],
  }));

  // 7. 清理：刪除整個專屬 temp 目錄
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 8. 輸出 index.json
  writeIndexFile(chunksInfo, outputDir);

  return { audioPath: finalAudio, chunks: chunksInfo };
}
