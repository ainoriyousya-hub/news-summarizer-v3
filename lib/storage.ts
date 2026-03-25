import { get, put } from "@vercel/blob";
import { StoredNewsData } from "@/lib/types";

function getToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN が設定されていません。");
  }

  return token;
}

function buildPath(date: string) {
  return `daily-news/${date}.json`;
}

// Private ストア前提で、読み書きの access を明示します。
export async function saveNewsData(date: string, data: StoredNewsData): Promise<void> {
  await put(buildPath(date), JSON.stringify(data, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    token: getToken(),
  });
}

// 読み込み失敗時は null を返すことで、API 側の制御を単純に保ちます。
export async function readNewsData(date: string): Promise<StoredNewsData | null> {
  try {
    const result = await get(buildPath(date), {
      access: "private",
      token: getToken(),
      useCache: false,
    });

    if (!result || result.statusCode !== 200) {
      return null;
    }

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as StoredNewsData;
  } catch (error) {
    console.error("Blobの読み込みに失敗しました。", { date, error });
    return null;
  }
}
