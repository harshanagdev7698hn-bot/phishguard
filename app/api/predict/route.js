// app/api/predict/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { urlFeatures } from "@/lib/features";
import { reasonsFromMeta } from "@/lib/explain";
import { getDb } from "@/lib/db";

/* --- Extra signals extracted here so we don't depend on lib changes --- */
function parseURLSafe(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  const withScheme = /^(https?:)?\/\//i.test(s) ? s : "http://" + s;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function extraSignals(rawUrl, meta = {}) {
  const u = parseURLSafe(rawUrl);
  const host = (u?.hostname || "").toLowerCase();
  const path = (u?.pathname || "") + (u?.search || "");
  const port = u?.port || "";
  const tld = host.split(".").pop() || "";

  // heuristics & keywords commonly used in phishing paths
  const KEYWORDS_RE = /(login|log[in|on]|sign[\-_. ]?in|account|verify|reset|update|secure|confirm|wallet|bank|pay|otp|auth|invoice|payment|unlock|support)/i;

  const hasLoginKeyword = KEYWORDS_RE.test(path);
  const hasUncommonPort = !!port && !["80", "443"].includes(port);
  const hasPunycode = host.startsWith("xn--");
  const hostLen = host.length;
  const pathLen = path.length;
  const subdomainCount = (host.match(/\./g) || []).length - 1; // exclude TLD dot

  // flags
  const hardFlags = [];
  if (hasPunycode) hardFlags.push("punycode domain");
  if (rawUrl.includes("@")) hardFlags.push("contains @ in URL");
  if (meta?.hasIP && hasLoginKeyword) hardFlags.push("IP host + login keyword");
  if (subdomainCount >= 4) hardFlags.push("excessive subdomains (>=4)");
  if (hostLen > 60) hardFlags.push("very long hostname");
  if (pathLen > 180) hardFlags.push("very long path/query");
  if (hasUncommonPort) hardFlags.push(`uncommon port :${port}`);
  // “http + login keyword” is very indicative
  if (u && u.protocol === "http:" && hasLoginKeyword) hardFlags.push("HTTP + login keyword");

  return {
    host, path, tld, port,
    hasLoginKeyword, hasUncommonPort, hasPunycode,
    hostLen, pathLen, subdomainCount,
    hardFlags
  };
}

/* --- Revised scoring --- */
function heuristicScore(meta, extra) {
  let score = 0;

  // original meta signals (kept)
  if (!meta.hasHttps) score += 0.20;
  if (meta.hasIP) score += 0.25;
  if (meta.suspTld) score += 0.15;
  if (meta.subdomainCount >= 3) score += 0.12;
  if (meta.counts.hyphens >= 3) score += 0.10;
  if (meta.counts.at > 0) score += 0.18;       // ↑ was 0.10
  if (meta.counts.len >= 100) score += 0.06;
  if (meta.entropy >= 4.0) score += 0.10;

  // extra signals (new)
  if (extra.hasPunycode) score += 0.30;
  if (extra.hasLoginKeyword) score += 0.18;
  if (extra.hasUncommonPort) score += 0.10;
  if (extra.hostLen > 45) score += 0.08;
  if (extra.pathLen > 120) score += 0.06;

  // cap
  return Math.max(0, Math.min(1, score));
}

const PHISHING_THRESHOLD = 0.35; // lower threshold to improve recall

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // base features from your lib
    const feats = urlFeatures(url.trim());
    if (feats.error) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

    const { meta } = feats;

    // compute extra signals and hard flags
    const extra = extraSignals(url, meta);

    // HARD FAILS: immediately classify as phishing
    const hardFail =
      extra.hardFlags.length > 0 ||
      meta.hasIP && meta.subdomainCount >= 1 ||
      (!meta.hasHttps && (extra.hasLoginKeyword || meta.counts.at > 0));

    const score = heuristicScore(meta, extra);
    const isPhishing = hardFail || score >= PHISHING_THRESHOLD;

    // reasons
    const reasons = [
      ...reasonsFromMeta(meta),
      ...(extra.hasLoginKeyword ? ["Path contains login/verification keywords"] : []),
      ...(extra.hasPunycode ? ["Domain is punycode (xn--)"] : []),
      ...(extra.hasUncommonPort ? [`Uncommon port :${extra.port}`] : []),
      ...(extra.hostLen > 45 ? ["Unusually long hostname"] : []),
      ...(extra.pathLen > 120 ? ["Very long path/query"] : []),
      ...(extra.hardFlags.length ? extra.hardFlags.map(f => `Hard flag: ${f}`) : [])
    ];

    const label = isPhishing ? "phishing" : "safe";
    const doc = { url, label, score, reasons, ts: new Date() };

    // save to DB if available (same as before)
    try {
      const db = await getDb();
      await db.collection("checks").insertOne(doc);
    } catch {
      /* ignore if DB not configured */
    }

    return NextResponse.json({ ...doc, features: { ...meta, ...extra } });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
