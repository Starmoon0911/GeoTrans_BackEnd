import connectDatabase from "@/src/database/mongodb";
import { db } from "@/src/database/mongodb";
import { schemas } from "@/src/database/schema";
(async () => {
    await connectDatabase();
    const result = await db.create("TestModel", { title: "Hello", content: "World" }, { title: String, content: String });

    const result2 = await db.create("TestModel2", { title: "你好", content: "世界" }, { title: String, content: String });
    console.log("Inserted document:", result);
})();