export default {
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
}