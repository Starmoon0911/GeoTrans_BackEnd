import { Types, Schema, Document, model } from 'mongoose'
export interface MediaAssetInput {
  url: string;
  description?: string;
}

export interface NewsParsedResult {
  content: string;
  media: MediaAssetInput[];  // 圖片
  files: MediaAssetInput[];  // PDF 檔案等
}
interface MediaAsset{
  url: string;
  description?: string;
  ai_description?: string;    // AI生成的描述
  generated_at?: Date;       // 描述生成時間
  model_version?: string;     // 使用的AI模型版本
}

interface ContentAnalysis extends Types.Subdocument {
  keywords: string[];
  entities: {
    name: string;
    type: 'LOCATION' | 'PERSON' | 'ORGANIZATION';
  }[];
  summary?: string;
}

interface BaseNews {
  title: string;
  pin?: boolean;
  publish_date: Date;
  files: Object[];
  source_url: string;
  original_content: string;
  processed_content?: string;
  media_assets: MediaAsset[];
  category: string
  metadata?: {
    scraper_version: string;
    processing_flow: string[];
  };
  tts?:{
    chinese?: string;
    taigi?: string;
  }
  analysis: string;
}