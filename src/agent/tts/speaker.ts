import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import safeProjectName from "@/utils/safeProjectName";

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

function segmentText(text: string): string[] {
  return text
    .replace(/([，。．！!？?])/g, "$1\n")
    .replace(/(\.|\?|!)(?=\s|$)/g, "$1\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0 && /[a-zA-Z\u4e00-\u9fff]/.test(s));
}

async function synthesizeChunk(
  text: string,
  index: number,
  tempDir: string
): Promise<string> {
  const res = await axios.post(
    "https://geotransai.wei0911.dpdns.org/tts",
    {
      text,
      text_lang: "zh",
      ref_audio_path: "ref_audio.wav",
      prompt_lang: "zh",
      prompt_text: "隨著深度學習的發展，自然語言處理技術越趨成熟",
      text_split_method: "cut0",
      streaming_mode: false,
    },
    { responseType: "arraybuffer" }
  );

  const filePath = path.join(tempDir, `chunk_${index}.wav`);
  fs.writeFileSync(filePath, res.data);
  return filePath;
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

function writeIndexFile(chunks: ChunkInfo[], outputDir: string) {
  const jsonPath = path.join(outputDir, "index_chinese.json");
  fs.writeFileSync(jsonPath, JSON.stringify(chunks, null, 2), "utf-8");
}

export async function processTTS(
  text: string,
  projectName: string
): Promise<{ audioPath: string; chunks: ChunkInfo[] }> {
  const _safeProjectName = safeProjectName(projectName);
  const tokens = tokenizeByTTS(text);
  
  const tempDir = path.resolve("temp", `${_safeProjectName}_${Date.now()}_chinese`);
  fs.mkdirSync(tempDir, { recursive: true });

  const audioChunkPaths: string[] = [];
  const allChunksMeta: (Omit<ChunkInfo, 'start' | 'end'> & { wasSynthesized: boolean })[] = [];
  let globalIndex = 0;
  let audioFileIndex = 0;

  for (const token of tokens) {
    if (token.tts) {
      const segments = segmentText(token.text);
      for (const segment of segments) {
        try {
          const filePath = await synthesizeChunk(segment, audioFileIndex, tempDir);
          audioChunkPaths.push(filePath);
          allChunksMeta.push({ index: globalIndex, text: segment, wasSynthesized: true });
          audioFileIndex++;
        } catch (err) {
          console.warn(`跳過TTS失敗的句子: "${segment}"`, Buffer.from(err.response.data).toString("utf8"));
          allChunksMeta.push({ index: globalIndex, text: segment, wasSynthesized: false });
        }
        globalIndex++;
      }
    } else {
      allChunksMeta.push({ index: globalIndex, text: token.text, wasSynthesized: false });
      globalIndex++;
    }
  }

  if (audioChunkPaths.length === 0) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    const outputDir = path.join("wav", `${_safeProjectName}_chinese`);
    fs.mkdirSync(outputDir, { recursive: true });
    const textOnlyChunks = allChunksMeta.map(meta => ({ ...meta, start: 0, end: 0 }));
    writeIndexFile(textOnlyChunks, outputDir);
    return { audioPath: "", chunks: textOnlyChunks };
  }

  const outputDir = path.join("wav", _safeProjectName);
  fs.mkdirSync(outputDir, { recursive: true });
  const finalAudioPath = path.join(outputDir, "audio_chinese.wav");

  const audioTimeStamps = await assembleChunks(audioChunkPaths, finalAudioPath, tempDir);

  const finalChunks: ChunkInfo[] = [];
  let audioStampIndex = 0;
  for (const meta of allChunksMeta) {
    if (meta.wasSynthesized) {
      const stamp = audioTimeStamps[audioStampIndex];
      if (stamp) {
        finalChunks.push({ index: meta.index, text: meta.text, start: stamp.start, end: stamp.end });
        audioStampIndex++;
      } else {
         finalChunks.push({ index: meta.index, text: meta.text, start: 0, end: 0 });
      }
    } else {
      const prevEnd = finalChunks.length > 0 ? finalChunks[finalChunks.length - 1].end : 0;
      finalChunks.push({ index: meta.index, text: meta.text, start: prevEnd, end: prevEnd });
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  writeIndexFile(finalChunks, outputDir);
  return { audioPath: _safeProjectName, chunks: finalChunks };
}