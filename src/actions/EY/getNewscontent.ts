import axios from 'axios';
import * as cheerio from 'cheerio';
import EYnewsModel, { Image } from '../../database/schemas/EYnews';
import { UpdateNewsTitle, UpdateImageDescriptions, generateNewsContent } from '../../lib/utils';

async function fetchNewsContent(url: string): Promise<{ content: string; images: Image[] } | null> {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const content = $('.words_content').text().trim();
    const images: Image[] = [];
    $('.photo_two li a').each((_, element) => {
      let imageUrl = $(element).attr('href');
      if (imageUrl) {
        if (!imageUrl.startsWith('http')) {
          imageUrl = `https://www.ey.gov.tw${imageUrl}`;
        }
        images.push({ url: imageUrl.trim(), desc: '' });
      }
    });

    return { content, images };
  } catch (error) {
    console.error(`Error fetching content for URL ${url}:`, error);
    return null;
  }
}


// 更新 MongoDB 中的新聞詳細內容
async function updateEYnewsContent() {
  try {
    // 查找需要更新的新聞項目
    const newsItems = await EYnewsModel.find({
      $or: [
        { content: { $exists: false } }, // 沒有文章內容
        { 'images.desc': { $exists: false } }, // 有圖片但缺少描述
        { 'images.desc': '' }, // 有描述但為空
        { 'agent.title': { $exists: false } }, // 沒有標題,
        { 'agent.title': '' },// 有標題但為空
        { 'agent.content': { $exists: false } },
        { 'agent.content': '' }
      ]
    });

    console.log(`Found ${newsItems.length} news items to update.`);

    for (const newsItem of newsItems) {
      console.log(`Fetching content for: ${newsItem.title}`);
      let contentData = null;
      if (!newsItem.content) {
        contentData = await fetchNewsContent(newsItem.link);
        if (contentData) {
          newsItem.content = contentData.content; // 更新文章內容
          newsItem.images = contentData.images; // 更新圖片陣列
        } else {
          console.warn(`Failed to fetch content for: ${newsItem.title}`);
          continue; // 如果無法抓取內容，跳過此新聞項目
        }
      }
      await UpdateNewsTitle(newsItem);
      
      await UpdateImageDescriptions(newsItem.images);

      await generateNewsContent(newsItem);

      
      await newsItem.save();
      console.log(`Updated content for: ${newsItem.title}`);
    }

    console.log('All news items have been processed.');
  } catch (error) {
    console.error('Error updating news content:', error);
  }
}

export default updateEYnewsContent;
