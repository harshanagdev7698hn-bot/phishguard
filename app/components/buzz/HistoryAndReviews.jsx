"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** Build a safe external URL from a row. Returns null if not possible. */
function safeHref(row) {
  const raw = row?.url ?? row?.link ?? row?.domain ?? "";
  if (!raw) return null;
  let h = String(raw).trim();

  // If it's just a hostname/domain, add a scheme
  if (!/^https?:\/\//i.test(h)) h = "http://" + h;

  try {
    // Validate URL
    const u = new URL(h);
    return u.toString();
  } catch {
    return null;
  }
}

function hostnameOf(u) {
  try {
    return new URL(u).hostname;
  } catch {
    return u || "-";
  }
}

const PAGE_SIZE = 20;

export default function HistoryAndReviews() {
  // history state
  const [hRows, setHRows] = useState([]);
  const [hHasMore, setHHasMore] = useState(true);
  const [hLoading, setHLoading] = useState(false);
  const [hErr, setHErr] = useState("");

  // reviews state
  const [rRows, setRRows] = useState([]);
  const [rHasMore, setRHasMore] = useState(true);
  const [rLoading, setRLoading] = useState(false);
  const [rErr, setRErr] = useState("");

  const hListRef = useRef(null);
  const hSentinelRef = useRef(null);
  const rListRef = useRef(null);
  const rSentinelRef = useRef(null);

  useEffect(() => {
    fetchHistory(0);
    fetchReviews(0);
  }, []);

  useEffect(() => {
    const el = hSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hHasMore && !hLoading) {
          setHLoading(true);
          fetchHistory(hRows.length).finally(() => setHLoading(false));
        }
      },
      { root: hListRef.current, threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hHasMore, hLoading, hRows.length]);

  useEffect(() => {
    const el = rSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && rHasMore && !rLoading) {
          setRLoading(true);
          fetchReviews(rRows.length).finally(() => setRLoading(false));
        }
      },
      { root: rListRef.current, threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rHasMore, rLoading, rRows.length]);

  async function fetchHistory(offset = 0) {
    try {
      const res = await fetch(`/api/history?limit=${PAGE_SIZE}&offset=${offset}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setHRows((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      setHHasMore(rows.length === PAGE_SIZE);
      setHErr("");
    } catch (e) {
      setHErr(e.message || "History error");
      setHHasMore(false);
    }
  }

  async function fetchReviews(offset = 0) {
    try {
      const res = await fetch(`/api/reviews?limit=${PAGE_SIZE}&offset=${offset}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reviews");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setRRows((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      const total = data?.total ?? 0;
      setRHasMore(offset + rows.length < total || rows.length === PAGE_SIZE);
      setRErr("");
    } catch (e) {
      setRErr(e.message || "Reviews error");
      setRHasMore(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* ========== Recent History ========== */}
      <div className="rounded-3xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-lg font-semibold">Recent History</h3>
          <Link href="/history" className="text-sm text-sky-300 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-[160px,1fr,120px,80px] px-4 py-2 text-[11px] font-semibold text-slate-200">
          <div>Time</div>
          <div>URL</div>
          <div>Label</div>
          <div>Score</div>
        </div>

        <div ref={hListRef} className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/10">
              {hRows.map((row, i) => {
                const href = safeHref(row);
                return (
                  <tr key={`${row.ts || ""}-${row.url || i}`}>
                    <td className="px-4 py-2.5 text-slate-300">
                      {row.ts ? new Date(row.ts).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:underline break-all"
                          title={href}
                        >
                          {hostnameOf(href)}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.label === "phishing" ? (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px]">Phishing</span>
                      ) : (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px]">Safe</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {typeof row.score === "number" ? `${Math.round(row.score * 100)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-xs text-slate-400">
                  {hLoading ? "Loading…" : hHasMore ? <span ref={hSentinelRef} /> : "End of history"}
                  {hErr && <span className="ml-2 text-red-300">{hErr}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Latest Reviews ========== */}
      <div className="rounded-3xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-lg font-semibold">Latest Reviews</h3>
          <Link href="/explore" className="text-sm text-sky-300 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-[96px,1fr,70px] px-4 py-2 text-[11px] font-semibold text-slate-200">
          <div>When</div>
          <div>Site</div>
          <div>Stars</div>
        </div>

        <div ref={rListRef} className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/10">
              {rRows.map((rv, i) => {
                const href = safeHref(rv);
                const rating = rv.stars ?? rv.rating ?? 0;
                return (
                  <tr key={`${rv.ts || ""}-${rv.url || rv.domain || i}`}>
                    <td className="px-4 py-2.5 text-slate-300">
                      {rv.ts ? new Date(rv.ts).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:underline break-all"
                          title={href}
                        >
                          {hostnameOf(href)}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {rv.text && (
                        <div className="mt-1 line-clamp-2 text-xs text-slate-300/90">{rv.text}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {"★".repeat(rating)}{" "}
                      <span className="opacity-40">{"☆".repeat(Math.max(0, 5 - rating))}</span>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={3} className="px-4 py-3 text-center text-xs text-slate-400">
                  {rLoading ? "Loading…" : rHasMore ? <span ref={rSentinelRef} /> : "End of reviews"}
                  {rErr && <span className="ml-2 text-red-300">{rErr}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
