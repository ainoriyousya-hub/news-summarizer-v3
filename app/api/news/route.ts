import { NextRequest, NextResponse } from "next/server";
import { getJstDateString } from "@/lib/rss";
import { readNewsData } from "@/lib/storage";

export const dynamic = "force-dynamic";

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? getJstDateString();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { data: null, message: "日付は YYYY-MM-DD 形式で指定してください。" },
      { status: 400 },
    );
  }

  const data = await readNewsData(date);
  return NextResponse.json({ data });
}
