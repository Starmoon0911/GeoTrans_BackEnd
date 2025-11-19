import connectDatabase, { db } from "@/src/database/mongodb";
async function moveEmbeddingToOwnColl() {
    await connectDatabase()
    const TargetCollection = db.collection("embeddings");
    const NantaoCollection = db.collection("NantouNews");
    const EducationCollection = db.collection("EducationNews");
    const NantaoNews = await NantaoCollection.find({}).toArray();
    const EducationNews = await EducationCollection.find({}).toArray();
    const allNews = [...NantaoNews, ...EducationNews];
    const bulkOps = allNews.map((news) => {
        return {
            insertOne: {
                document: {
                    title: news.title,
                    embeddings: news.embeddings,
                    source_url: news.source_url,
                    _id: news._id, // 保留原始 ID
                },
            },
        };
    });
    await TargetCollection.bulkWrite(bulkOps);
    console.log("Embeddings moved to own collection successfully.");
}

moveEmbeddingToOwnColl()