import EducationNewsModel from '../../../../database/schemas/educationNews';
import express from 'express';
import { isValidObjectId } from 'mongoose';
import type { NewsItem } from '../../../../types/NewsItem'; // 確保 NewsItem 定義正確

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 5; // 每頁資料數量
    const page = parseInt(req.query.page as string) || 1;   // 當前頁數
    const id = req.query.id as string | undefined;         // 若有傳入 ID 查詢特定資料

    try {
        // 驗證 limit
        if (limit > 30) {
            return res.status(400).json({ success: false, data: "回傳資料數超過限制!(30)" });
        }

        // 驗證 ID 格式
        if (id && !isValidObjectId(id)) {
            return res.status(400).json({ success: false, data: "id格式錯誤!" });
        }

        const skip = (page - 1) * limit; // 計算應跳過的資料數量
        let query: any = {};            // 查詢條件

        // 如果有傳入 ID，返回單一資料
        if (id) {
            query._id = id;
            const newsItem = await EducationNewsModel.findOne(query).exec();
            if (!newsItem) {
                return res.status(404).json({ success: false, data: "找不到符合的資料!" });
            }
            return res.status(200).json({ success: true, data: newsItem });
        }

        // 查詢多筆資料
        const news: NewsItem[] = (await EducationNewsModel.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .exec())
            .map(news => ({
                ...news.toObject(),
                source: '教育部'
            }));


        const total = await EducationNewsModel.countDocuments(query); // 資料總數
        const totalPages = Math.ceil(total / limit);                 // 總頁數

        // 如果沒有資料
        if (news.length === 0) {
            return res.status(200).json({ success: false, data: [], message: "沒有符合條件的資料" });
        }

        // 正常回傳資料（包括最後一頁）
        res.status(200).json({
            success: true,
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
