// app/api/predict/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { urlFeatures } from "@/lib/features";
import { reasonsFromMeta } from "@/lib/explain";
import { getDb } from "@/lib/db";

function heuristicScore(meta) {
  let score = 0;
  if (!meta.hasHttps) score += 0.25;
  if (meta.hasIP) score += 0.25;
  if (meta.suspTld) score += 0.15;
  if (meta.subdomainCount >= 3) score += 0.1;
  if (meta.counts.hyphens >= 3) score += 0.1;
  if (meta.counts.at > 0) score += 0.1;
  if (meta.counts.len >= 100) score += 0.05;
  if (meta.entropy >= 4.0) score += 0.1;
  return Math.max(0, Math.min(1, score));
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const feats = urlFeatures(url.trim());
    if (feats.error) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

    const { meta } = feats;
    const score = heuristicScore(meta);
    const label = score >= 0.5 ? "phishing" : "safe";
    const reasons = reasonsFromMeta(meta);
    const doc = { url, label, score, reasons, ts: new Date() };

    // save to DB if available
    try {
      const db = await getDb();
      await db.collection("checks").insertOne(doc);
    } catch {
      // DB not configured or not running; ignore
    }

    return NextResponse.json({ ...doc, features: meta });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
