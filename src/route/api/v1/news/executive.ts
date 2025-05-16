import EYnewsModel from '../../../../database/schemas/EYnews';
import express from 'express';
import { isValidObjectId } from 'mongoose';
import type { NewsItem } from '../../../../types/NewsItem';  // 確保 NewsItem 定義正確
const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const page = parseInt(req.query.page as string) || 1;
    const id = req.query.id as string | undefined;

    try {
        if (limit > 30) {
            return res.status(400).json({ success: false, data: "回傳資料數超過限制!(30)" });
        }
        if (id && !isValidObjectId(id)) {
            return res.status(400).json({ success: false, data: "id格式錯誤!" });
        }

        const skip = (page - 1) * limit;
        let query: any = {};

        if (id) {
            query._id = id;
            // 查詢單一資料並強制轉換為 NewsItem 型別
            const newsItem = await EYnewsModel.findOne(query).exec();
            if (!newsItem) {
                return res.status(404).json({ success: false, data: "找不到符合的資料!" });
            }
            return res.status(200).json({ success: true, data: newsItem });
        }

        // 查詢多筆資料並強制轉換為 NewsItem[] 型別
        const news: NewsItem[] = (await EYnewsModel.find(query).sort({ date: -1 }).skip(skip).limit(limit).exec()) .map(news => ({
            ...news.toObject(),
            source: '行政院'
        }));;
        const total = await EYnewsModel.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        if (news.length === 0) {
            return res.status(200).json({ success: true, data: [], message: "沒有符合條件的資料" });
        }

        if (page > totalPages) {
            return res.status(200).json({
              success: true,
              data: [],
              message: "已經沒有更多資料了!"
            });
          }
          

        res.status(200).json({
            success: true,
            source: "行政院",
            data: news,
            total: total,
            page: page,
            totalPages: totalPages,

        });
    } catch (error) {
        res.status(500).json({ success: false, data: error.message });
    }
});

export default router;
