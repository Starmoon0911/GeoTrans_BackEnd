// src/utils/retry.ts
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      console.warn(`第 ${attempt} 次嘗試失敗：`, error?.message || error);
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, delay * attempt)); // exponential backoff
    }
  }
  throw new Error("重試次數用盡");
}
