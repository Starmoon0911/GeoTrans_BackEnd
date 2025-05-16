import express from 'express';
const router = express.Router();
import Feedback from '../../../../database/schemas/feedback';
router.post('/', async (req, res) => {
    const { emoji, feedback, newsID } = req.body;
    try {
        if (!emoji || !feedback || !newsID) {
            return res.status(400).json({ success: false, message: '缺少必要參數' });
        }
        const newFeedback = new Feedback({
            emoji: emoji.emoji,
            label: emoji.label,
            feedbackText: feedback,
            newsID: newsID
        });
        await newFeedback.save();
        res.status(200).json({ success: true, data: newFeedback });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
})
export default router;