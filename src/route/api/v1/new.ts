import express from 'express';
import connectDatabase from '@/src/database/mongodb';
import mongoose from 'mongoose';
import { db } from '@/src/database/mongodb';
import { BaseNews } from '@/interface/News';

const router = express.Router();

function getModelName(source: string): string {
  const capital = source.charAt(0).toUpperCase() + source.slice(1);
  return `${capital}News`;
}

router.get('/', async (req, res) => {
  const id = (req.query.id as string) || undefined;
  const source = (req.query.source as string) || undefined;
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.max(parseInt((req.query.limit as string) || '10', 10), 1);
  const skip = (page - 1) * limit;

  try {
    await connectDatabase();

    if (id) {
      let targetCollections: string[] = [];

      if (source) {
        targetCollections = [getModelName(source)];
      } else {
        const collections = await mongoose.connection.db.listCollections().toArray();
        targetCollections = collections
          .map(col => col.name)
          .filter(name => name.endsWith('News'));
      }

      const objId = mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;
      const filter = objId ? { _id: objId } : { _id: id };

      const results = await Promise.all(
        targetCollections.map(async name => {
          try {
            // 這裡保證傳入 string，並且符合你的 db API 參數
            return await db.findOne<BaseNews>(name as string, filter);
          } catch (err) {
            console.warn(`查詢 ${name} 時發生錯誤：`, err);
            return null;
          }
        })
      );

      const found = results.find(r => r !== null && r !== undefined) as BaseNews | undefined;
      if (found) {
        const { embeddings, ...rest } = found as any;
        return res.json(rest);
      }

      return res.status(404).json({ error: `ID ${id} not found` });
    }

    // 沒有 id → 回傳列表
    let allItems: BaseNews[] = [];

    if (!source) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const newsCollections = collections
        .map(col => col.name)
        .filter(name => name.endsWith('News'));

      const results = await Promise.all(
        newsCollections.map(async name => {
          try {
            return await db.findMany<BaseNews>(name as string, {});
          } catch (err) {
            console.warn(`讀取 ${name} 時發生錯誤：`, err);
            return [];
          }
        })
      );
      allItems = results.flat();
    } else {
      const modelName = getModelName(source);
      const collections = await mongoose.connection.db.listCollections().toArray();
      const availableCollections = collections.map(col => col.name);

      if (!availableCollections.includes(modelName)) {
        return res.status(400).json({ error: `Unknown source: ${source}` });
      }

      allItems = await db.findMany<BaseNews>(modelName, {});
    }

    if (!allItems || allItems.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    const sortedItems = allItems.sort((a, b) => {
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;
      return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
    });

    const paginatedItems = sortedItems.slice(skip, skip + limit);
    const total = allItems.length;
    const totalPages = Math.ceil(total / limit);

    const sanitizedItems = paginatedItems.map(({ embeddings, ...rest }) => rest);

    return res.json({
      page,
      limit,
      total,
      totalPages,
      data: sanitizedItems,
    });

  } catch (err) {
    console.error('Fetch paginated news failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
