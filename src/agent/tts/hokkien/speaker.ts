// src/agent/tts/taigi_speaker.ts
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const ROMA_URL = "http://tts001.iptcloud.net:8804/html_taigi_zh_tw_py";
const TTS_URL  = "http://tts001.iptcloud.net:8804/synthesize_TLPA";

export interface ChunkInfo {
  start: number;
  end: number;
  index: number;
  text: string;       // 原始中文句
  roman: string;      // 對應羅馬拼音
}

async function segmentText(text: string): Promise<string[]> {
  return text
    .replace(/([，。．！!？?])/g, "$1\n")
    .replace(/(\.|\?|!)(?=\s|$)/g, "$1\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function romanize(text: string): Promise<string> {
  const res = await axios.get(ROMA_URL, {
    params: { text0: text }
  });
  // 伺服器回傳純文字格式的羅馬拼音
  return String(res.data).trim();
}

async function synthesizeTaigi(
  roman: string,
  index: number,
  tempDir: string,
  gender: "女聲" | "男聲",
  accent: "強勢腔（高雄腔）" | "次強勢腔（台北腔）"
): Promise<string> {
  const res = await axios.get(TTS_URL, {
    params: {
      text1: roman,
      gender,
      accent
    },
    responseType: "arraybuffer"
  });

  const filePath = path.join(tempDir, `chunk_${index}.wav`);
  fs.writeFileSync(filePath, res.data);
  return filePath;
}

function getAudioDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file)) {
      return reject(new Error(`找不到音訊檔 ${file}`));
    }
    ffmpeg.ffprobe(file, (_err, data) => {
      if (!data || !data.format) {
        return reject(new Error(`ffprobe 無法取得檔案資訊: ${file}`));
      }
      resolve(data.format.duration ?? 0);
    });
  });
}

async function assembleChunks(
  chunkPaths: string[],
  outputPath: string,
  tempDir: string
): Promise<Pick<ChunkInfo, "start" | "end" | "index">[]> {
  const listPath = path.join(tempDir, "tts_files.txt");
  if (!fs.existsSync(listPath)) {
    fs.writeFileSync(listPath, "", "utf-8");
  }
  // 寫入 concat 列表
  const listContent = chunkPaths.map(p => `file '${p}'`).join("\n");
  fs.writeFileSync(listPath, listContent, "utf-8");

  // 計算各段長度
  let total = 0;
  const stamps: { start: number; end: number; index: number }[] = [];
  for (let i = 0; i < chunkPaths.length; i++) {
    const d = await getAudioDuration(chunkPaths[i]);
    stamps.push({ start: total, end: total + d, index: i });
    total += d;
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

  return stamps;
}

function writeIndexFile(chunks: ChunkInfo[], outDir: string) {
  const p = path.join(outDir, "index.json");
  fs.writeFileSync(p, JSON.stringify(chunks, null, 2), "utf-8");
}

/**
 * 閩南語 TTS 入口
 * @param text       原始中文
 * @param project    專案名稱（用於輸出資料夾與 temp 子資料夾）
 * @param gender     "女聲" 或 "男聲"
 * @param accent     "強勢腔（高雄腔）" 或 "次強勢腔（台北腔）"
 */
export async function processTaigiTTS(
  text: string,
  project: string,
  gender: "女聲" | "男聲",
  accent: "強勢腔（高雄腔）" | "次強勢腔（台北腔）"
): Promise<{ audioPath: string; chunks: ChunkInfo[] }> {
  // 1. 切句
  const segments = await segmentText(text);

  // 2. 專屬 temp 子資料夾
  const tempDir = path.resolve("temp", `${project}_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // 3. 逐句：先羅馬拼音，再 TTS，記錄 chunk 路徑
  const chunkPaths: string[] = [];
  const romans: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const r = await romanize(s);
    romans.push(r);
    const p = await synthesizeTaigi(r, i, tempDir, gender, accent);
    chunkPaths.push(p);
  }

  // 4. 建立輸出目錄：wav/{project}/audio.wav
  const outDir = path.resolve("wav", project);
  fs.mkdirSync(outDir, { recursive: true });
  const finalAudio = path.join(outDir, "audio.wav");

  // 5. 拼接 & 取得純時間戳
  const rawStamps = await assembleChunks(chunkPaths, finalAudio, tempDir);

  // 6. 組成帶中文、羅馬、時間戳的 chunks
  const chunksInfo: ChunkInfo[] = rawStamps.map(ts => ({
    start: ts.start,
    end: ts.end,
    index: ts.index,
    text: segments[ts.index],
    roman: romans[ts.index],
  }));

  // 7. 清理：刪除該次 temp 子資料夾
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 8. 寫入 index.json
  writeIndexFile(chunksInfo, outDir);

  return { audioPath: finalAudio, chunks: chunksInfo };
}
