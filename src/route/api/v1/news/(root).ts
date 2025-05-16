import express from 'express';
import EducationNewsModel from '../../../../database/schemas/educationNews';
import EYnewsModel from '../../../../database/schemas/EYnews';
const router = express.Router();
import { isValidObjectId } from 'mongoose';
// 取得所有新聞並分頁
router.get('/', async (req: express.Request, res: express.Response) => {
    const limit = parseInt(req.query.limit as string) || 5; // 每頁顯示的資料數量
    const page = parseInt(req.query.page as string) || 1;   // 當前頁數
    const id = req.query.id as string;
    if (id) {
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "無效的 ID" });
        }
        try {
            // 先從兩個模型中查詢
            const educationNews = await EducationNewsModel.findById(id).exec();
            if (educationNews) {
                return res.status(200).json({
                    success: true,
                    data: {
                        ...educationNews.toObject(),
                        source: '教育部',
                    },
                });
            }

            const eyNews = await EYnewsModel.findById(id).exec();
            if (eyNews) {
                return res.status(200).json({
                    success: true,
                    data: {
                        ...eyNews.toObject(),
                        source: '行政院',
                    },
                });
            }

            // 如果都找不到
            res.status(404).json({ success: false, message: "找不到對應的新聞" });
        } catch (error) {
            res.status(500).json({ success: false, data: error.message });
        }
    }

    try {
        const skip = (page - 1) * limit; // 計算跳過的資料數量

        // 從兩個模型中查詢資料並加上 source 屬性
        const educationNews = (await EducationNewsModel.find({}).sort({ date: -1 }).exec()).map(news => ({
            ...news.toObject(),
            source: '教育部'
        }));

        const eyNews = (await EYnewsModel.find({}).sort({ date: -1 }).exec()).map(news => ({
            ...news.toObject(),
            source: '行政院'
        }));

        // 合併並根據日期排序
        const combinedNews = [...educationNews, ...eyNews];
        const sortedNews = combinedNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 計算總頁數
        const total = sortedNews.length;
        const totalPages = Math.ceil(total / limit);

        // 應用分頁
        const pagedNews = sortedNews.slice(skip, skip + limit);

        // 回傳結果給前端
        if (pagedNews.length === 0) {
            return res.status(200).json({ success: false, data: [], message: "沒有符合條件的資料" });
        }

        res.status(200).json({
            success: true,
            data: pagedNews,
            total: total,
            page: page,
            totalPages: totalPages,
        });
    } catch (error) {
        res.status(500).json({ success: false, data: error.message });
    }
});


export default router;
