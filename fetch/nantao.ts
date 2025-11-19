// scheduler.ts
import cron from "node-cron";
import fetchNantouNews from "@src/actions/nantou/main";
// 每天 12 點執行
cron.schedule("0 12 * * *", async () => {
    try {
        console.log(`[${new Date().toISOString()}] 開始執行 main 函式`);
        await fetchNantouNews();
        console.log(`[${new Date().toISOString()}] main 函式執行完成`);
    } catch (err) {
        console.error("執行 main 函式失敗:", err);
    }
});

console.log("scheduler 已啟動，每天 12 點會自動執行 main 函式");
