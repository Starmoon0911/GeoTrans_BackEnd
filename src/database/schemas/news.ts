// schemas/NantouNewsSchema.ts
import { Schema } from "mongoose";

export default {
  title: { type: String, required: true },
  publish_date: { type: Date, required: true },
  files: [
    {
      _id: false,
      url: { type: String, required: true },
      name: { type: String, required: true },
    },
  ],
  source_url: { type: String, required: true },
  original_content: { type: String },
  processed_content: { type: String },

  media_assets: [
    {
      url: { type: String, required: true },
      description: { type: String },
      ai_description: { type: String },
      generated_at: { type: Date },
      model_version: { type: String },
    },
  ],
  pin: { type: Boolean, default: false },
  tts: {
    chinese: { type: String },
    taigi: { type: String },
  },
  category: { type: String, required: true },

  metadata: {
    scraper_version: { type: String },
    processing_flow: [{ type: String }],
  },

  analysis: {
    summary: { type: String },
    keywords: [{ type: String }],
    sentiment: { type: String },
    score: { type: Number },
  },
};
