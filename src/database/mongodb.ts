// src/database/mongodb.js
import { createModel } from "../../utils/createModel";
import { schemas } from "./schema";
import mongoose from "mongoose";

const connectDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        console.log("已經連線到資料庫");
        return; // 已經有連線，直接返回
    }

    try {
        console.log("正在連線到資料庫...");
        await mongoose.connect(process.env.mongodbURL);
        console.log("資料庫連線成功");
    } catch (error) {
        console.error("資料庫連線失敗", error);
        return error;
    }
};

export const db = {
    /**
     * 建立資料
     */
    create: async <T>(
        modelName: string,
        data: Partial<T>,
        schemaDefinition?: Record<string, any> // 可選：若沒傳就用固定 schema
    ): Promise<T> => {
        const usedSchema = schemaDefinition || schemas[modelName];
        const Model = createModel<T>(modelName, usedSchema);
        const doc = new Model(data);
        const saved = await doc.save();
        return saved.toObject() as T;
    },


    /**
     * 查詢單筆（用 ID 或條件）
     */
    findOne: async <T>(
        modelName: keyof typeof schemas,
        filter: any
    ): Promise<T | null> => {
        const Model = createModel<T>(modelName, schemas[modelName]);
        const doc = await Model.findOne(filter).lean<T>().exec();
        return doc as T | null;
    },

    /**
     * 查詢多筆
     */
    findMany: async <T>(
        modelName: keyof typeof schemas,
        filter: any = {},
        options: { sort?: any; limit?: number } = {}
    ): Promise<T[]> => {
        const Model = createModel<T>(modelName, schemas[modelName]);
        let query = Model.find(filter).sort(options.sort || {});
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const docs = await query.lean<T>().exec();
        return docs as T[];
    },

    /**
     * 更新
     */
    update: async <T>(
        modelName: keyof typeof schemas,
        filter: any,
        update: Partial<T>
    ) => {
        const Model = createModel<T>(modelName, schemas[modelName]);
        return await Model.updateMany(filter, { $set: update }).exec();
    },

    /**
     * 刪除
     */
    remove: async (modelName: keyof typeof schemas, filter: any) => {
        const Model = createModel(modelName, schemas[modelName]);
        return await Model.deleteMany(filter).exec();
    },
    getCollectionNames: async () => {
        const collections = await mongoose.connection.db.listCollections().toArray()
        return collections.map(col => col.name);

    },
    aggregate: async (modelName, pipeline) => {
        const Model = createModel(modelName, schemas[modelName]);
        return await Model.aggregate(pipeline).exec();
    },
    collection: (name) => {
        if (mongoose.connection.readyState !== 1) {
            throw new Error("資料庫尚未連線，無法取得 collection。");
        }
        return mongoose.connection.db.collection(name);
    },
};
export default connectDatabase;
