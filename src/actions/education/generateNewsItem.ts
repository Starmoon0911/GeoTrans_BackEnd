import EducationNewsModel from "../../database/schemas/educationNews";
import {
    generateNewsContent,
    UpdateImageDescriptions,
    UpdateNewsTitle,
} from '../../lib/utils';
export default async function generateEducationNewsItem() {
    const newsItems = await EducationNewsModel.find({
        $or: [
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

        await UpdateNewsTitle(newsItem);

        await UpdateImageDescriptions(newsItem.images);

        await generateNewsContent(newsItem);


        await newsItem.save();
        console.log(`Updated content for: ${newsItem.title}`);

        console.log('All news items have been processed.');

    }

}