// routes/newsProcess.ts
import express from 'express';
import { retry } from '@/utils/retry';
import generateTitle from '@/src/agent/news/generateTitle';
import generateContent from '@/src/agent/news/generateContent';
import generateInfo from '@/src/agent/news/generateInfo';
import generateImagesDescription from '@/src/agent/news/generateImagesDescription';
import GetTextEmbedding from '@/src/agent/TextEmbedding';
import { processTaigiTTS } from '@/src/agent/tts/hokkien/speaker';
import { RandomStr } from '@/utils/RandmonStr';
import config from '@/config';

const router = express.Router();

interface MediaAssetInput {
  url: string;
}

interface NewsAIRequest {
  title?: string;
  content: string;
  media?: MediaAssetInput[];
  files?: string[];
}

router.post('/', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  function sendEvent(event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    const { title = '無標題', content, media = [], files = [] }: NewsAIRequest = req.body;

    if (!content || content.trim() === '') {
      sendEvent('error', { message: '缺少必要的 content 參數' });
      return res.end();
    }

    sendEvent('status', '開始處理新聞內容');

    sendEvent('step', '生成標題');
    const ai_title = await retry(() => generateTitle(content, title), 3, 60000);

    sendEvent('step', '生成內文');
    const ai_content = await retry(() => generateContent(content, media), 3, 60000);

    sendEvent('step', '分類與分析');
    const ai_infoResp = await retry(() => generateInfo(content), 3, 60000);
    const ai_info = JSON.parse(ai_infoResp ?? '{}');

    sendEvent('step', '生成標題向量');
    const title_embedding = await GetTextEmbedding(ai_title);

    sendEvent('step', '描述圖片');
    const mediaAssets = await Promise.all(
      media.map(async (asset) => ({
        url: asset.url,
        description: '',
        ai_description: await retry(() => generateImagesDescription(asset.url)).catch(() => ''),
        generated_at: new Date(),
        model_version: config.modelConfig.visionModel,
      }))
    );

    sendEvent('step', '生成台語語音');
    const projectName = await RandomStr(10);
    const taigiTTS = await processTaigiTTS(ai_content, projectName, '女聲', '強勢腔（高雄腔）');

    sendEvent('step', '整合完成');

    const result = {
      title: ai_title,
      processed_content: ai_content,
      category: ai_info.category ?? '',
      analysis: ai_info.analysis ?? '',
      embeddings: {
        title: title_embedding,
      },
      media_assets: mediaAssets,
      tts: {
        taigi: taigiTTS.audioPath,
      },
      files,
    };

    sendEvent('done', result);
    res.end();
  } catch (err: any) {
    sendEvent('error', { message: '處理失敗', error: err.message });
    res.end();
  }
});

export default router;