// app/api/history/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  try {
    const db = await getDb();
    const coll = db.collection("checks");
    const cursor = coll.find({}).sort({ ts: -1 }).skip(offset).limit(limit);
    const rows = await cursor.toArray();

    // quick stats (fast on small datasets; for large use aggregation)
    const total = await coll.estimatedDocumentCount();
    const safe = await coll.countDocuments({ label: "safe" });
    const phishing = await coll.countDocuments({ label: "phishing" });

    return NextResponse.json({
      rows,
      stats: { total, safe, phishing, byLabel: { safe, phishing } },
    });
  } catch {
    // No DB — return empty
    return NextResponse.json({
      rows: [],
      stats: { total: 0, safe: 0, phishing: 0, byLabel: { safe: 0, phishing: 0 } },
    });
  }
}
