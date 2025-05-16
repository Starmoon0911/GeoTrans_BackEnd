import EducationNewsModel from '../../database/schemas/educationNews';
import axios from 'axios';
import type Image from '../../types/Image';
import * as cheerio from 'cheerio';
import generateImagesDescription from '../../agent/news/generateImagesDescription';
// 爬取單條教育新聞的詳細內容
async function fetchEducationNewsContent(url: string): Promise<{ content: string; images: Image[] } | null> {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // 獲取 `#ContentPlaceHolder1_divcontent` 中的內容，排除 `.page-image`
        const contentElements = $("#ContentPlaceHolder1_divcontent")
            .children()
            .not(".page-image");
        const content = contentElements
            .map((_, el) => $(el).text().trim())
            .get()
            .join("\n");

        // 獲取圖片和描述
        const images: Image[] = [];
        $("div.news_box03_img ol li a").each((_, element) => {
            const imageUrl = $(element).attr("href");
            const desc = $(element).attr("title")?.replace("[另開新視窗]", "").trim() || "";

            if (imageUrl) {
                images.push({
                    url: imageUrl.trim(),
                    desc: desc,
                });
            }
        });

        return { content, images };
    } catch (error) {
        console.error(`Error fetching content for URL ${url}:`, error);
        return null;
    }
}

// 更新 MongoDB 中的教育新聞詳細內容
async function FetchEducationNewsContent() {
    try {
        // 查找需要更新的新聞項目
        const newsItems = await EducationNewsModel.find({
            $or: [
                { content: { $exists: false } }, // 沒有文章內容
            ],
        });

        console.log(`Found ${newsItems.length} education news items to update.`);

        for (const newsItem of newsItems) {
            console.log(`Fetching content for: ${newsItem.title}`);
            let contentData = null;

            // 如果缺少內容，抓取新的內容
            if (!newsItem.content) {
                contentData = await fetchEducationNewsContent(newsItem.link);
                if (contentData) {
                    newsItem.content = contentData.content; // 更新文章內容
                    newsItem.images = contentData.images; // 更新圖片陣列
                } else {
                    console.warn(`Failed to fetch content for: ${newsItem.title}`);
                    continue; // 如果無法抓取內容，跳過此新聞項目
                }
            }
            // 儲存更新結果
            await newsItem.save();
            console.log(`Updated content for: ${newsItem.title}`);
        }

        console.log('All education news items have been processed.');
    } catch (error) {
        console.error('Error updating education news content:', error);
    }
}

export default FetchEducationNewsContent;
