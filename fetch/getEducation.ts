import connectDatabase from "../src/database/mongodb";
import mongoose from "mongoose";
import fetchEductionNews from "../src/actions/education/getNews";
import FetchEducationNewsContent from "../src/actions/education/getNewscontent";
import generateEducationNewsItem from "../src/actions/education/generateNewsItem";

export default async function getEducation() {
    await connectDatabase()
    console.log("Step 1:獲取基本的訊息")
    const step1response = await fetchEductionNews();
    console.log(`Step 1:Done!\n更新了${step1response.length}筆資料\n`)
    
    console.log("Step 2:進入Link獲取新聞內容and照片")
    await FetchEducationNewsContent();
    console.log(`Step 2:Done!\n\n`)
    
    console.log("Step 3:使用agent生成文字等")
    await generateEducationNewsItem();
    console.log(`Step 3:Done!\n\n`)
    await mongoose.disconnect();
}
