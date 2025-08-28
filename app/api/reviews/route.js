// app/api/reviews/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function sanitize(s, max = 500) {
  if (!s) return "";
  return String(s).slice(0, max);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  try {
    const db = await getDb();
    const coll = db.collection("reviews");
    const total = await coll.estimatedDocumentCount();
    const rows = await coll.find({}).sort({ ts: -1 }).skip(offset).limit(limit).toArray();
    return NextResponse.json({ total, rows });
  } catch {
    return NextResponse.json({ total: 0, rows: [] });
  }
}

export async function POST(req) {
  try {
    const { url, stars, text, name } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const doc = {
      url: sanitize(url, 2048),
      stars: Math.max(1, Math.min(5, Number(stars) || 5)),
      text: sanitize(text, 500),
      name: sanitize(name, 100),
      ts: new Date(),
    };
    try {
      const db = await getDb();
      await db.collection("reviews").insertOne(doc);
    } catch {
      // ignore if DB not available
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Bad request" }, { status: 400 });
  }
}
