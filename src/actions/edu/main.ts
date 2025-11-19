import fetchRssFeed from "../FetchRss";
import config from "@/config";
import connectDatabase, { db } from "@/src/database/mongodb";
import { schemas } from "@/src/database/schema";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import GetTextEmbedding from "@/src/agent/TextEmbedding";
import { BaseNews, MediaAssetInput, NewsParsedResult } from "@/interface/News";
import generateContent from "@/src/agent/news/generateContent";
import generateTitle from "@/src/agent/news/generateTitle";
import generateInfo from "@/src/agent/news/generateInfo";
import generateImagesDescription from "@/src/agent/news/generateImagesDescription";
import { processTaigiTTS } from "@src/agent/tts/hokkien/speaker";
import { retry } from "@/utils/retry";
import { RandomStr } from "@/utils/RandmonStr";
import { processTTS } from "@/src/agent/tts/speaker";

// 介面定義 (與原檔案保持一致)
interface MediaAsset {
    url: string;
    description?: string;
    ai_description?: string;
    generated_at?: Date;
    model_version?: string;
}

interface NewsItem {
    title: string;
    link: string;
    date: Date;
    description: string;
}

const tempDirRoot = path.resolve(process.cwd(), "temp");
if (!fs.existsSync(tempDirRoot)) {
    fs.mkdirSync(tempDirRoot, { recursive: true });
}

// 🔧 Changed: 專門為教育部網站設計的爬蟲函式
async function EducationNewsCtxCrawler(link: string, tempDir: string): Promise<NewsParsedResult | undefined> {
    try {
        console.log(`[教育部爬蟲] 🚀 開始爬取網頁內容: ${link}`);
        const { data: html } = await axios.get(link);
        const $ = cheerio.load(html);

        // 提取主要文章內容
        const articleContent: string[] = [];
        $('#ContentPlaceHolder1_divcontent p').each((_, el) => {
            const text = $(el).text().trim();
            if (text) articleContent.push(text);
        });

        // 提取圖片資源
        const imageAssets: MediaAssetInput[] = [];
        const seenImageUrls = new Set<string>();
        const baseUrl = new URL(link).origin; // 以當前文章連結的 origin 作為基準 URL

        // 提取內文中的主要圖片
        $('#ContentPlaceHolder1_divcontent .page-image img').each((_, el) => {
            const src = $(el).attr('src');
            if (src) {
                const fullUrl = new URL(src, baseUrl).href;
                if (!seenImageUrls.has(fullUrl)) {
                    imageAssets.push({ url: fullUrl, description: $(el).attr('alt') || '' });
                    seenImageUrls.add(fullUrl);
                }
            }
        });

        // 提取 "相關圖片" 區塊的圖片
        $('#RelData1_liPic a.fancybox-buttons').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
                const fullUrl = new URL(href, baseUrl).href;
                if (!seenImageUrls.has(fullUrl)) {
                    const desc = $(el).attr('title')?.replace('[點圖放大]', '').trim() || '';
                    imageAssets.push({ url: fullUrl, description: desc });
                    seenImageUrls.add(fullUrl);
                }
            }
        });

        // 提取 "相關檔案" 區塊的檔案
        const fileAssets: MediaAssetInput[] = [];
        $('#RelData1_liFile .news_box03_data > ol > li').each((_, item) => {
            const fileItem = $(item);
            const name = fileItem.find('span').first().text().trim();
            const href = fileItem.find('a').attr('href');
            
            if (href) {
                const fullUrl = new URL(href, baseUrl).href;
                fileAssets.push({ url: fullUrl, description: name || '未命名檔案' });
            }
        });
        
        const result: NewsParsedResult = {
            content: articleContent.join('\n\n'),
            media: imageAssets,
            files: fileAssets,
        };
        
        console.log(`[教育部爬蟲] ✅ 爬取成功。內容長度: ${result.content.length}, 圖片數: ${result.media.length}, 檔案數: ${result.files.length}`);
        
        const jsonOutputPath = path.join(tempDir, 'output.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error(`[教育部爬蟲] ❌ 爬取失敗：${link}`, error);
        return undefined;
    }
}

// 🔧 Changed: 主函式更名並修改配置
export default async function fetchEducationNews() {
    console.log("🚀 開始執行教育部新聞抓取任務...");
    const url = config.RSS.education; // 🔧 Changed
    const newsItems: NewsItem[] | undefined = (await fetchRssFeed(url, "2day")).map((item: any) => ({
        ...item,
        date: new Date(item.date)
    }));

    if (!newsItems || newsItems.length === 0) {
        console.log("🟡 無法獲取 RSS feed 或 feed 為空，任務結束。");
        return;
    }
    
    console.log(`📰 從 RSS Feed 獲取了 ${newsItems.length} 篇文章。`);

    await connectDatabase();
    const embeddingCollection = db.collection("embeddings");
    const collectionName = "EducationNews"; // 🔧 Changed: 定義新的 Collection 名稱

    for (const newsItem of newsItems) {
        console.log(`\n--- --- --- --- --- ---`);
        console.log(`[檢查] 正在檢查文章: "${newsItem.title}"`);
        const cleanedLink = newsItem.link.trim().replace(/<[^>]+>/g, "");
        const exist = await db.findOne(collectionName, { source_url: cleanedLink });

        if (!exist) {
            console.log(`[處理] 🟢 發現新文章，開始處理: ${newsItem.title}`);
            const tempDir = path.resolve(tempDirRoot, `temp_EduNews_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            try {
                // 🔧 Changed: 呼叫新的爬蟲函式
                const parsed = await EducationNewsCtxCrawler(newsItem.link, tempDir);
                if (!parsed || !parsed.content) {
                    console.warn(`🟡 [跳過] 無法解析內容或內容為空: ${newsItem.link}`);
                    continue;
                }

                const { content, media, files } = parsed;

                console.log("[AI] 🧠 正在生成新標題...");
                const ai_title = await retry(() => generateTitle(content, newsItem.title), 3, 60000);
                console.log("[AI] 🧠 正在生成摘要內容...");
                const ai_content = await retry(() => generateContent(content, media), 3, 60000);
                console.log("[AI] 🧠 正在分析類別與實體...");
                const ai_infoResp = await retry(() => generateInfo(content), 3, 60000);
                const ai_info = JSON.parse(ai_infoResp);
                console.log("[AI] 🧠 正在生成標題向量...");
                const title_embedding = await GetTextEmbedding(ai_title);

                console.log(`[AI] 🖼️  正在為 ${media.length} 張圖片生成描述...`);
                const mediaAssets = await Promise.all(
                    media.map(async (asset, index) => {
                        console.log(`  - 正在處理第 ${index + 1} / ${media.length} 張圖片...`);
                        return {
                            url: asset.url,
                            description: asset.description || '',
                            ai_description: await retry(() => generateImagesDescription(asset.url), 2, 30000).catch(() => ""),
                            generated_at: new Date(),
                            model_version: config.modelConfig.visionModel,
                        };
                    })
                );

                const projectName = await RandomStr(10);
                console.log("[TTS] 🔊 正在生成台語語音...");
                const taigiTTS = await processTaigiTTS(ai_content, projectName, "女聲", "強勢腔（高雄腔）");
                console.log("[TTS] 🔊 正在生成國語語音...");
                const chineseTTS = await processTTS(ai_content, projectName);
                
                const doc: BaseNews = {
                    title: ai_title,
                    publish_date: newsItem.date,
                    files: files.map(f => ({ url: f.url, name: f.description || '未命名檔案' })),
                    source_url: newsItem.link,
                    original_content: content,
                    processed_content: ai_content,
                    media_assets: mediaAssets as MediaAsset[],
                    tts: {
                        taigi: taigiTTS.audioPath,
                        chinese: chineseTTS.audioPath,
                    },
                    category: ai_info.category,
                    analysis: ai_info.analysis,
                };

                console.log("[儲存] 💾 正在組合最終資料並準備儲存...");
                // 🔧 Changed: 使用新的 Collection 名稱
                const result = await db.create(collectionName, doc, schemas.News);
                console.log(`[儲存] ✅ 資料儲存成功！ 新聞 ID: ${(result as any)._id}`);
                const embedding_docs = {
                    _id: (result as any)._id,
                    source_url: newsItem.link,
                    title: ai_title,
                    embeddings: title_embedding,
                }
                const embeddingResult = await embeddingCollection.insertOne(embedding_docs)
                console.log(`[儲存] ✅ 向量資料儲存成功！ 向量 ID: ${embeddingResult.insertedId}`);
            } catch (err) { 
                console.error(`[錯誤] ❌ 處理文章 ${newsItem.link} 時發生嚴重錯誤，跳過該筆新聞:`, err);
            } finally {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } else {
            console.log(`[檢查] 🟡 文章已存在，跳過。`);
        }
    }
    console.log("\n🎉 教育部新聞抓取任務全部完成。");
}

fetchEducationNews().catch(err => {
    console.error("❌ 執行 fetchEducationNews 時發生未處理的頂層錯誤:", err);
});