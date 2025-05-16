import fetch from "node-fetch"; 
async function urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch the URL: ${response.statusText}`);
    }
    const buffer = await response.buffer(); // 使用 buffer 讀取二進制內容
    return `data:${response.headers.get("content-type")};base64,${buffer.toString("base64")}`;
}

export default urlToBase64;
