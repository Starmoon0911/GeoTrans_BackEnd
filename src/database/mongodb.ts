// src/database/mongodb.js
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
        throw error;
    }
};

export default connectDatabase;
