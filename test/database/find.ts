import connectDatabase from "@/src/database/mongodb";
import { db } from "@/src/database/mongodb";
import { schemas } from "@/src/database/schema";

(async () => {
    await connectDatabase();
    
    const result = await db.findMany("NantouNews", {})
    console.log("Find document:", result);
})(); 