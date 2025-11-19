import mongoose, { Schema, Model } from "mongoose";

const modelCache: Record<string, Model<any>> = {};

export function createModel<T>(
  modelName: string,
  schemaDefinition: Record<string, any>,
  collectionName?: string
): Model<T> {
  // 刪除 Mongoose 的模型快取（重新定義 schema）
  if (mongoose.models[modelName]) {
    delete mongoose.models[modelName];
    delete modelCache[modelName]; // 自己的快取也要清掉
  }

  const schema = new Schema<T>(schemaDefinition, {
    timestamps: true,
    collection: collectionName || modelName,
  });

  const model = mongoose.model<T>(modelName, schema);
  modelCache[modelName] = model;
  return model;
}
