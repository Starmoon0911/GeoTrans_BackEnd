import { Types, Schema, Document, model } from 'mongoose'


interface MediaAsset extends Types.Subdocument {
    url: string;
    description?: string;
    ai_description?: string;    // AI生成的描述
    generated_at?: Date;       // 描述生成時間
    model_version?: string;     // 使用的AI模型版本
    source_hash: string;       // 預生成哈希
}

interface ContentAnalysis extends Types.Subdocument {
    keywords: string[];
    entities: {
        name: string;
        type: 'LOCATION' | 'PERSON' | 'ORGANIZATION';
    }[];
    summary?: string;          
}

interface BaseNews extends Document {
    title: string;
    publish_date: Date;
    source_url: string;
    original_content: string;
    processed_content?: string;  
    media_assets: MediaAsset[];
    category: 'GENERAL' | 'EDUCATION' | 'POLICY';
    metadata: {
      scraper_version: string;   
      processing_flow: string[]; 
    };
    analysis: ContentAnalysis;
    embeddings: {
      text?: number[];            
      image?: number[];          
    };
  }