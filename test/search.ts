// test-api.js
import axios from 'axios';

// --- 配置 ---
// 確保這個 URL 和端口與您本地運行的伺服器相符
// 假設您的 Express 應用程式運行在 3000 port，且路由掛載在 /api/search
const API_ENDPOINT = 'http://localhost:9000/api/v1/search';

/**
 * 封裝一個測試函式，方便日誌輸出
 * @param {string} testName - 測試案例的名稱
 * @param {object} requestPayload - 要發送到 API 的請求 body
 */
const runTest = async (testName, requestPayload) => {
    console.log(`\n🚀 --- 執行測試: ${testName} ---`);
    console.log('   請求 Body:', JSON.stringify(requestPayload));

    try {
        const response = await axios.post(API_ENDPOINT, requestPayload, {
            // 設定一個 10 秒的超時時間，避免測試卡住
            timeout: 10000,
        });
        console.log(`✅ 成功! 狀態碼: ${response.status}`);
        // 只顯示前 3 筆結果，避免洗版
        if (response.data.results) {
            console.log(`   回傳了 ${response.data.results.length} 筆資料`);
            console.log('   資料範例:', JSON.stringify(response.data.results.slice(0, 3), null, 2));
        } else {
            console.log('   回傳資料:', response.data);
        }

    } catch (error) {
        if (error.response) {
            // 請求已發出，但伺服器以錯誤狀態碼回應
            console.error(`❌ 失敗! 狀態碼: ${error.response.status}`);
            console.error('   錯誤訊息:', error.response.data);
        } else if (error.request) {
            // 請求已發出，但沒有收到回應 (例如伺服器未啟動)
            console.error(`❌ 致命錯誤! 無法連線到伺服器。`);
            console.error(`   請檢查 API 是否正在 ${API_ENDPOINT} 運行。`);
        } else {
            // 設定請求時發生錯誤
            console.error('❌ 致命錯誤! 請求設定有誤:', error.message);
        }
    }
};

/**
 * 主執行函式
 */
const main = async () => {
    console.log('=============== 開始執行 API 測試 ===============');

    // 測試 1: 正常情況 - 使用預設 collection
    await runTest('正常情況 - 使用預設 collection', {
        query: '青蛙種類'
    });

    // 測試 2: 正常情況 - 指定單一 collection
    await runTest('正常情況 - 指定單一 collection', {
        query: '附近住宅',
        collections: ['NantouNews'] // 即使只有一個也要用陣列
    });

    // 測試 3: 邊界情況 - 使用 limit 參數
    await runTest('邊界情況 - 使用 limit 參數限制回傳數量', {
        query: '南投',
        limit: 2
    });

    // 測試 4: 錯誤情況 - 沒有提供 query
    await runTest('錯誤情況 - 沒有提供 query', {
        //故意不給 query
    });

    // 測試 5: 錯誤情況 - query 為空字串
    await runTest('錯誤情況 - query 為只包含空白的空字串', {
        query: '   '
    });

    // 測試 6: 錯誤情況 - collections 是無效的格式
    await runTest('錯誤情況 - collections 是無效的格式 (應為陣列)', {
        query: '測試',
        collections: 'not_an_array' // 傳送字串而非陣列
    });

    console.log('\n=============== 所有測試執行完畢 ===============');
};

// 執行所有測試
main();