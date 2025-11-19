import express from 'express';
import GetTextEmbedding from '@/src/agent/TextEmbedding';
import { db } from '@/src/database/mongodb';

const router = express.Router();

// 預設可搜尋的 collections
const SEARCHABLE_COLLECTIONS = ['embeddings'];
const SCORE_THRESHOLD = 0.010;
router.post('/', async (req, res) => {
    const {
        query,
        collections,
        limit = 10,
        vectorIndexName = 'default',
        textIndexName = 'default_search'
    } = req.body || {};

    console.log("\n===== [DEBUG] 前端請求參數 =====");
    console.log("query:", query);
    console.log("collections:", collections);
    console.log("limit:", limit);
    console.log("vectorIndexName:", vectorIndexName);
    console.log("textIndexName:", textIndexName);
    console.log("================================\n");

    if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: '參數 "query" 為必填且不可為空字串' });
    }
    if (collections && !Array.isArray(collections)) {
        return res.status(400).json({ error: '參數 "collections" 的格式不正確，必須是陣列 (Array)' });
    }

    const collectionsToSearch = (Array.isArray(collections) && collections.length > 0)
        ? collections
        : SEARCHABLE_COLLECTIONS;

    console.log("[DEBUG] collectionsToSearch（最終搜尋的資料表清單）:", collectionsToSearch);

    if (collectionsToSearch.length === 0) {
        return res.status(400).json({ error: '沒有可供搜尋的資料來源' });
    }

    try {
        const queryEmbedding = await GetTextEmbedding(query);
        console.log("[DEBUG] queryEmbedding 長度:", queryEmbedding?.length || '無');
        if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
            return res.status(500).json({ error: '生成文字向量失敗或格式不正確' });
        }

        const k = 60;
        const searchLimit = parseInt(limit, 10);

        const pipeline: any[] = [
            {
                $search: {
                    index: textIndexName,
                    text: { query: query, path: { wildcard: '*' } }
                }
            },
            { $addFields: { score: { $meta: "searchScore" } } },
            { $setWindowFields: { sortBy: { score: -1 }, output: { rank: { $rank: {} } } } },
            { $addFields: { rrf_score: { $divide: [1, { $add: [k, "$rank"] }] } } },
            { $project: { rank: 0, score: 0 } }
        ];

        collectionsToSearch.forEach((colName) => {
            console.log(`[DEBUG] 加入 $unionWith -> ${colName}`);
            pipeline.push({
                $unionWith: {
                    coll: colName,
                    pipeline: [
                        {
                            $vectorSearch: {
                                index: vectorIndexName,
                                path: 'embeddings',
                                queryVector: queryEmbedding,
                                numCandidates: searchLimit * 15,
                                limit: searchLimit * 2,
                            }
                        },
                        { $addFields: { score: { $meta: "vectorSearchScore" } } },
                        { $setWindowFields: { sortBy: { score: -1 }, output: { rank: { $rank: {} } } } },
                        { $addFields: { rrf_score: { $divide: [1, { $add: [k, "$rank"] }] } } },
                        { $addFields: { source_collection: colName } },
                        { $project: { rank: 0, score: 0 } }
                    ]
                }
            });
        });

        console.log("\n===== [DEBUG] MongoDB Aggregate Pipeline =====");
        console.dir(pipeline, { depth: null });
        console.log("============================================\n");

        pipeline.push(
            {
                $group: {
                    _id: "$_id",
                    title: { $first: "$title" },
                    source_collection: { $first: "$source_collection" },
                    combined_score: { $sum: "$rrf_score" }
                }
            },
            { $sort: { combined_score: -1 } },
            { $limit: 50 }
        );

        const collection = db.collection(collectionsToSearch[0]);
        const allRankedResults = await collection.aggregate(pipeline).toArray();

        console.log('\n--- [DEBUG] 檢視篩選前的所有結果分數 ---');
        console.table(allRankedResults.map(r => ({
            title: r.title ? r.title.substring(0, 30) + '...' : '(無標題)',
            score: r.combined_score,
            source: r.source_collection
        })));
        console.log('--- [DEBUG] 閾值 (SCORE_THRESHOLD):', SCORE_THRESHOLD, ' ---\n');

        const filteredResults = allRankedResults.filter(
            (result) => result.combined_score >= SCORE_THRESHOLD
        );

        console.log("[DEBUG] 篩選後的結果數量:", filteredResults.length);

        const finalResults = filteredResults.slice(0, searchLimit);

        if (finalResults.length === 0) {
            console.warn("[DEBUG] 沒有找到符合條件的新聞");
            return res.status(200).json({
                message: '找不到相關結果，請嘗試其他關鍵字。',
                results: []
            });
        }

        return res.status(200).json({ results: finalResults });

    } catch (error) {
        console.error('混合搜尋失敗:', error);
        if (error.codeName === 'IndexNotFound' || (error.message && error.message.includes('$rank'))) {
            return res.status(500).json({ error: `搜尋失敗：請確保向量索引和文字索引都已建立且設定正確。錯誤: ${error.message}` });
        }
        return res.status(500).json({ error: '搜尋時發生未預期的伺服器內部錯誤' });
    }
});


export default router;
