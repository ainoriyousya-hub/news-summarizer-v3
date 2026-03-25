import { NextResponse } from "next/server";
import { collectAndPersistNews } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await collectAndPersistNews();

    return NextResponse.json({
      success: true,
      message: "手動収集が完了しました。",
      ...result,
    });
  } catch (error) {
    console.error("手動収集APIでエラーが発生しました。", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "手動収集に失敗しました。",
      },
      { status: 500 },
    );
  }
}
