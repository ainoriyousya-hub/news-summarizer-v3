import { NextRequest, NextResponse } from "next/server";
import { collectAndPersistNews } from "@/lib/collector";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || !header?.startsWith("Bearer ")) {
    return false;
  }

  return header.slice("Bearer ".length) === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, message: "認証に失敗しました。" },
      { status: 401 },
    );
  }

  try {
    const result = await collectAndPersistNews();

    return NextResponse.json({
      success: true,
      message: "自動収集が完了しました。",
      ...result,
    });
  } catch (error) {
    console.error("自動収集APIでエラーが発生しました。", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "自動収集に失敗しました。",
      },
      { status: 500 },
    );
  }
}
