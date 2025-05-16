import { ObjectId } from 'mongodb';
import mongoose, { Schema, Document } from 'mongoose';

// 定義 Feedback 的接口
interface FeedbackDocument extends Document {
  emoji: string | null; // 表情符號，例如 '😊'
  label: string | null; // 表情對應的文字描述，例如 '滿意'
  feedbackText: string; // 用戶的意見文字
  submittedAt: Date; // 提交時間
  userId?: string; // 可選，用於標記提交用戶
  newsID: string; // 可選，用於標記提交的新聞ID
}

// 定義 Mongoose 的 Schema
const FeedbackSchema = new Schema<FeedbackDocument>({
  emoji: {
    type: String,
    enum: ['😐', '😊', '😟', null], // 限制可用的表情符號
    default: null,
  },
  label: {
    type: String,
    enum: ['普通', '滿意', '不滿意', null], // 與表情符號對應的描述
    default: null,
  },
  feedbackText: {
    type: String,
    required: true, // 意見文字為必填
    trim: true,
    maxlength: 1000, // 限制文字長度
  },
  submittedAt: {
    type: Date,
    default: Date.now, // 默認為當前時間
  },
  newsID: {
    type: String,
    required: true,
  }
});

// 創建 Mongoose 模型
const Feedback = mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);

export default Feedback;
