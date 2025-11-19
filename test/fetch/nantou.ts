import fetchNantouNews from "@/src/actions/nantou/main";
import connectDatabase, { db } from "@/src/database/mongodb";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import config from "@/config";
import GetTextEmbedding from "@/src/agent/TextEmbedding";
import { BaseNews, MediaAssetInput, NewsParsedResult } from "@/interface/News";

const tempDirRoot = path.resolve(process.cwd(), "temp");

interface MediaAsset {
    url: string;
    description?: string;
    ai_description?: string;
    generated_at?: Date;
    model_version?: string;
}

import generateContent from "@/src/agent/news/generateContent";
import generateTitle from "@/src/agent/news/generateTitle";
import generateInfo from "@/src/agent/news/generateInfo";
import generateImagesDescription from "@/src/agent/news/generateImagesDescription";
import { schemas } from "@/src/database/schema";

if (!fs.existsSync(tempDirRoot)) {
    fs.mkdirSync(tempDirRoot);
}

async function NewsCtxCrawler(link: string, tempDir: string): Promise<NewsParsedResult | undefined> {
    try {
        const { data: html } = await axios.get(link);
        const $ = cheerio.load(html);

        const articleContent: string[] = [];
        $('.ck-content p').each((_, el) => {
            const text = $(el).text().trim();
            if (text) articleContent.push(text);
        });

        const imageAssets: MediaAssetInput[] = [];
        $('.ck-content figure.image img').each((_, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) {
                imageAssets.push({ url: src });
            }
        });

        const fileAssets: MediaAssetInput[] = [];
        $('.pages-article-files-block .files-item a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('../../upload/')) {
                const fullUrl = 'https://www.nantou.gov.tw/' + href.replace(/^\.\.\//, '/');
                fileAssets.push({ url: fullUrl });
            }
        });

        const jsonOutputPath = path.join(tempDir, 'output.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify({
            content: articleContent.join('\n\n'),
            media: imageAssets,
            files: fileAssets,
        }, null, 2));
        console.log(`JSON 結果已儲存至：${jsonOutputPath}`);

        return {
            content: articleContent.join('\n\n'),
            media: imageAssets,
            files: fileAssets,
        };
    } catch (error) {
        console.error('爬取失敗：', error);
        return undefined;
    }
}
export default async function getNantouNews() {
    fetchNantouNews().then(async (news) => {
        await connectDatabase();

        for (const New of news) {
            const cleanedLink = New.link.trim().replace(/<[^>]+>/g, "");
            const exist = await db.findOne("NantouNews", { link: cleanedLink });
            if (exist) break;

            const tempDir = path.resolve(tempDirRoot, `temp_News_${Date.now()}`);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const news_tmp = {
                title: New.title.trim().replace(/<[^>]+>/g, ""),
                link: cleanedLink,
                date: new Date(New.date),
                description: New.description.trim().replace(/<[^>]+>/g, ""),
            };

            const tempFilePath = path.join(tempDir, "index.json");
            fs.writeFileSync(tempFilePath, JSON.stringify(news_tmp, null, 2));

            const parsed = await NewsCtxCrawler(news_tmp.link, tempDir);
            if (!parsed) continue;

            const { content, media, files } = parsed;

            const ai_title = await generateTitle(content, news_tmp.title);
            const ai_content = await generateContent(content, media);
            const ai_infoResp = await generateInfo(content);
            const ai_info = JSON.parse(ai_infoResp);
            const title_embedding = await GetTextEmbedding(ai_title);

            const fileUrls: string[] = files.map(f => f.url);

            const mediaAssetsRaw = await Promise.all(
                media.map(async (asset) => ({
                    url: asset.url,
                    description: '',
                    ai_description: await generateImagesDescription(asset.url),
                    generated_at: new Date(),
                    model_version: config.modelConfig.visionModel,
                }))
            );

            const mediaAssets = mediaAssetsRaw as unknown as MediaAsset[];

            const doc: BaseNews = {
                title: ai_title,
                publish_date: news_tmp.date,
                files: fileUrls,
                source_url: news_tmp.link,
                original_content: content,
                processed_content: ai_content,
                media_assets: mediaAssets,
                category: ai_info.category,
                analysis: ai_info.analysis,
                embeddings: {
                    title: title_embedding,
                },
            };
            console.log("儲存的資料：", doc);
            const result = await db.create("NantouNews", doc, schemas.News);
            console.log("儲存結果：", result);
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }).catch((error) => {
        console.error("Error fetching Nantou news:", error);
    });

}
