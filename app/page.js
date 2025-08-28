"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useI18n } from "../lib/i18n";

const PAGE_SIZE = 20;
const COLORS = ["#34d399", "#f87171"]; // safe / phishing

export default function Home() {
  return <MainPage />;
}

function MainPage() {
  const { t } = useI18n();

  // URL checker state
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // History state (compact + infinite)
  const [histRows, setHistRows] = useState([]);
  const [histStats, setHistStats] = useState({ total: 0, safe: 0, phishing: 0 });
  const [histHasMore, setHistHasMore] = useState(true);
  const [histLoadingMore, setHistLoadingMore] = useState(false);
  const [histErr, setHistErr] = useState("");

  // Reviews state (scrollable + infinite)
  const [revRows, setRevRows] = useState([]);
  const [revHasMore, setRevHasMore] = useState(true);
  const [revLoadingMore, setRevLoadingMore] = useState(false);
  const [revErr, setRevErr] = useState("");
  const revSentinelRef = useRef(null);

  // initial loads
  useEffect(() => {
    fetchHistoryPage(0);
    fetchReviewsPage(0);
  }, []);

  // infinite scroll for reviews list
  useEffect(() => {
    if (!revSentinelRef.current) return;
    if (!revHasMore || revLoadingMore || revErr) return;
    const rootEl = document.querySelector("#reviews-scroll-root") || null;
    const ob = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting && !revLoadingMore && revHasMore && !revErr) {
            setRevLoadingMore(true);
            fetchReviewsPage(revRows.length).finally(() =>
              setRevLoadingMore(false)
            );
          }
        }
      },
      { root: rootEl, threshold: 1 }
    );
    ob.observe(revSentinelRef.current);
    return () => ob.disconnect();
  }, [revHasMore, revLoadingMore, revErr, revRows.length]);

  // handle check
  async function onCheck(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
      // refresh right columns
      await Promise.all([fetchHistoryPage(0), fetchReviewsPage(0)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // history page fetch
  async function fetchHistoryPage(offset = 0) {
    try {
      const res = await fetch(
        `/api/history?limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed history");
      const newRows = Array.isArray(data.rows) ? data.rows : [];
      setHistRows((prev) => (offset === 0 ? newRows : [...prev, ...newRows]));
      setHistStats({
        total: data.stats?.total || 0,
        safe: data.stats?.safe || 0,
        phishing: data.stats?.phishing || 0,
      });
      setHistHasMore(newRows.length === PAGE_SIZE);
      setHistErr("");
    } catch (e) {
      setHistErr(e.message);
      setHistHasMore(false);
    }
  }

  // reviews page fetch
  async function fetchReviewsPage(offset = 0) {
    try {
      const res = await fetch(
        `/api/reviews?limit=20&offset=${offset}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed reviews");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setRevRows((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      const total = data?.total ?? rows.length;
      const hasMore = offset + rows.length < total;
      setRevHasMore(hasMore);
      setRevErr("");
    } catch (e) {
      setRevErr(e.message);
      setRevHasMore(false);
    }
  }

  // Derived UI pieces
  const verdict =
    result?.label === "phishing" ? "PHISHING" : result ? "SAFE" : "";
  const verdictColorClass =
    result?.label === "phishing" ? "text-red-300" : "text-emerald-300";
  const ringColor = result?.label === "phishing" ? "#f87171" : "#34d399";
  const scorePct = Math.round((result?.score || 0) * 100);

  const pieData = [
    { name: "Safe", value: histStats.safe },
    { name: "Phishing", value: histStats.phishing },
  ];

  // Top Buzz data: compute from existing history & reviews (no extra API)
  const buzz = useMemo(() => {
    // Latest Site Threats: latest phishing rows
    const latestThreats = histRows
      .filter((r) => r.label === "phishing")
      .slice(0, 6);

    // Popular Sites: aggregate by hostname from reviews
    const freq = new Map();
    for (const r of revRows) {
      const u = tryHost(r.url || r.domain || "");
      if (!u) continue;
      freq.set(u, (freq.get(u) || 0) + 1);
    }
    const popular = [...freq.entries()]
      .map(([host, cnt]) => ({ host, count: cnt }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return { latestThreats, popular };
  }, [histRows, revRows]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <DecorativeBackground />

      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-emerald-400 ring-2 ring-white/10" />
          <h1 className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              {t("brand.name")}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-2 text-xs">
            <a href="#checker" className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">
              {t("sections.checkTitle")}
            </a>
            <a href="#sticky" className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">
              How it works
            </a>
            <a href="#buzz" className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">
              Community Buzz
            </a>
            <a href="#history-reviews" className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">
              Recent History & Latest Reviews
            </a>
          </nav>
          <LanguageMenu />
          <AuthButtons />
        </div>
      </motion.header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-4 pt-2 md:grid-cols-[1.15fr_.85fr]">
        <Reveal>
          <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
            {t("brand.tagline")}{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              instantly
            </span>
            .
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            Paste any URL to get a clear verdict, confidence score, and reasons—plus a growing
            community of reviews. Privacy-friendly, fast, and free.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
            <Badge>HTTPS checks</Badge>
            <Badge>Suspicious TLD flags</Badge>
            <Badge>Entropy & symbols</Badge>
            <Badge>No fetch of target site</Badge>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <HeroPanel />
        </Reveal>
      </section>

      {/* CHECKER + RESULT */}
      <section id="checker" className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-8 md:grid-cols-2">
        <Reveal>
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
            <h3 className="mb-4 text-lg font-semibold">{t("sections.checkTitle")}</h3>
            <form onSubmit={onCheck} className="flex w-full items-stretch gap-3">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/login"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400/60"
              />
              <button
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/10 disabled:opacity-50"
              >
                {loading ? t("actions.submitting") : t("actions.check")}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-300">
              <Tip title="HTTPS">{t("tips.https")}</Tip>
              <Tip title="TLDs">{t("tips.tlds")}</Tip>
              <Tip title="Symbols">{t("tips.symbols")}</Tip>
              <Tip title="IP">{t("tips.ip")}</Tip>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
            <h3 className="mb-4 text-lg font-semibold">{t("sections.resultTitle")}</h3>

            {!result && !loading && (
              <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                {t("result.pastePrompt")}{" "}
                <span className="font-semibold text-white">{t("actions.check")}</span>
              </div>
            )}

            {loading && (
              <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                <Spinner /> <p className="mt-3">Analyzing URL…</p>
              </div>
            )}

            {result && !loading && (
              <div className="grid gap-5">
                <div className="flex items-center gap-4">
                  <ScoreRing pct={scorePct} ring={ringColor} />
                  <div>
                    <div className={`text-2xl font-extrabold ${verdictColorClass}`}>{verdict}</div>
                    <div className="text-xs text-slate-300">{t("result.confidence")}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-slate-200">{t("result.why")}</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {result.reasons?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <details className="rounded-2xl border border-white/10 bg-white/5 p-4 open:shadow-inner">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    {t("result.features")}
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-3 text-xs text-slate-200">
                    {JSON.stringify(result.features, null, 2)}
                  </pre>
                </details>

                <ReviewForm
                  url={url}
                  onDone={() => {
                    fetchHistoryPage(0);
                    fetchReviewsPage(0);
                  }}
                />
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* PARALLAX BAND */}
      <ParallaxBand />

      {/* HOW IT WORKS (animated) */}
      <StickyShowcase id="sticky" />

      {/* Quick Stats */}
      <Reveal>
        <section className="mx-auto max-w-6xl px-6">
          <h3 className="text-2xl font-bold">{t("sections.quickStats")}</h3>
          {histErr && (
            <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {histErr}
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title={t("sections.total")} value={histStats.total} />
            <Card title="% Safe" value={`${percent(histStats.safe, histStats.total)}%`} accent="emerald" />
            <Card title="% Phishing" value={`${percent(histStats.phishing, histStats.total)}%`} accent="red" />
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-200">Safe vs Phishing</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Community Buzz (Top Buzz) */}
      <Reveal>
        <section id="buzz" className="mx-auto max-w-6xl px-6 pt-10">
          <h3 className="mb-4 text-2xl font-bold">Top Buzz</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Latest Site Threats */}
            <div className="rounded-3xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-lg font-semibold">Latest Site Threats</div>
                <span className="text-xs text-slate-400">auto-refreshes with your history</span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-300">
                  <tr className="border-y border-white/10 bg-white/5">
                    <th className="px-3 py-2.5">Site Name</th>
                    <th className="px-3 py-2.5">Last Updated</th>
                    <th className="px-3 py-2.5">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {buzz.latestThreats.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-slate-400">
                        No phishing entries yet. Check a suspicious URL to see entries here.
                      </td>
                    </tr>
                  )}
                  {buzz.latestThreats.map((r, i) => {
                    const host = tryHost(r.url) || r.url;
                    return (
                      <tr key={`${r.ts}-${i}`} className="border-t border-white/10">
                        <td className="px-3 py-2.5">
                          <Link
                            href={r.url || "#"}
                            target={r.url ? "_blank" : undefined}
                            className="text-sky-300 hover:underline"
                          >
                            {host}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.ts ? new Date(r.ts).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px]">
                            Warning
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Popular Sites */}
            <div className="rounded-3xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-lg font-semibold">Popular Sites</div>
                <span className="text-xs text-slate-400">based on your community reviews</span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-300">
                  <tr className="border-y border-white/10 bg-white/5">
                    <th className="px-3 py-2.5">Site Name</th>
                    <th className="px-3 py-2.5">Total Reviews</th>
                    <th className="px-3 py-2.5">Our Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {buzz.popular.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-slate-400">
                        No reviews yet. Submit a few to populate this list.
                      </td>
                    </tr>
                  )}
                  {buzz.popular.map((p, i) => (
                    <tr key={p.host + i} className="border-t border-white/10">
                      <td className="px-3 py-2.5">
                        <Link
                          href={`http://${p.host}`}
                          target="_blank"
                          className="text-sky-300 hover:underline"
                        >
                          {p.host}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{p.count}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px]">
                          Safe
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </Reveal>

      {/* History & Reviews (side-by-side) */}
      <Reveal>
        <section
          id="history-reviews"
          className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-12 pt-10 md:grid-cols-2"
        >
          {/* History */}
          <div className="rounded-3xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-lg font-semibold">{t("sections.recentHistory")}</h3>
              <button
                onClick={() => fetchHistoryPage(histRows.length)}
                disabled={!histHasMore || histLoadingMore}
                className="text-xs text-sky-300 disabled:opacity-50"
              >
                {histLoadingMore ? "Loading…" : histHasMore ? "Load more" : "End"}
              </button>
            </div>
            <div className="grid grid-cols-[150px,1fr,110px,80px] bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200">
              <div>{t("table.time")}</div>
              <div>{t("table.url")}</div>
              <div>{t("table.label")}</div>
              <div>{t("table.score")}</div>
            </div>
            <CompactHistoryScroll
              rows={histRows}
              hasMore={histHasMore}
              loadingMore={histLoadingMore}
              onLoadMore={async () => {
                if (histLoadingMore || !histHasMore || histErr) return;
                setHistLoadingMore(true);
                await fetchHistoryPage(histRows.length);
                setHistLoadingMore(false);
              }}
            />
          </div>

          {/* Reviews */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("sections.latestReviews")}</h3>
            </div>

            <div id="reviews-scroll-root" className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <ul className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {revRows.map((r, i) => {
                  const rating = r.stars ?? r.rating ?? 0;
                  const comment = r.text ?? r.comment ?? "";
                  const who = r.user?.email || r.name || "";
                  const link = r.url || (r.domain ? `http://${r.domain}` : "");
                  const hostname = tryHost(link) || (r.domain || "");
                  return (
                    <li
                      key={`${link}-${r.ts || i}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 hover:-translate-y-0.5 transition-transform"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {link ? (
                          <Link
                            href={link}
                            target="_blank"
                            className="truncate text-cyan-300 underline"
                            title={link}
                          >
                            {hostname}
                          </Link>
                        ) : (
                          <span className="truncate text-slate-300">{hostname || "—"}</span>
                        )}
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                          {r.ts ? new Date(r.ts).toLocaleString() : ""}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        {"★".repeat(rating)}{"☆".repeat(5 - rating)}{" "}
                        {comment && <span className="opacity-80">· {comment}</span>}
                      </div>
                      {who && <div className="mt-1 text-xs text-slate-400">by {who}</div>}
                    </li>
                  );
                })}
                <li ref={revSentinelRef} className="h-6" />
                {!revHasMore && (
                  <li className="py-2 text-center text-xs opacity-60">— end —</li>
                )}
                {revLoadingMore && (
                  <li className="py-2 text-center text-xs opacity-60">Loading…</li>
                )}
                {revErr && (
                  <li className="py-2 text-center text-xs text-red-300">{revErr}</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Local keyframes */}
      <style jsx>{`
        @keyframes floatY { 0% { transform: translateY(0) } 50% { transform: translateY(-10px) } 100% { transform: translateY(0) } }
        @keyframes spinSlow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes pulseGlow { 0%,100% { opacity: .5; filter: blur(40px) } 50% { opacity: .9; filter: blur(55px) } }
        .animate-float { animation: floatY 6s ease-in-out infinite }
        .animate-spin-slow { animation: spinSlow 24s linear infinite }
        .animate-glow { animation: pulseGlow 8s ease-in-out infinite }
      `}</style>
    </main>
  );
}

/* -------------------- Little helpers / bits -------------------- */

function DecorativeBackground() {
  return (
    <>
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-glow" />
      <div className="pointer-events-none absolute top-40 -right-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl animate-glow" />
      <div className="pointer-events-none absolute -top-10 right-10 hidden h-48 w-48 rounded-full border border-dashed border-white/15 md:block animate-spin-slow" />
    </>
  );
}

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "0px 0px -20% 0px", once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ParallaxBand() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);

  return (
    <section ref={ref} className="relative my-8 py-20">
      <motion.div style={{ scale }} className="absolute inset-0 -z-10">
        <motion.div style={{ y: y1 }} className="absolute left-8 top-6 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
        <motion.div style={{ y: y2 }} className="absolute right-8 bottom-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
      </motion.div>

      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 to-white/10 p-6 text-center backdrop-blur">
            <h3 className="text-xl font-semibold">
              Fast, privacy-friendly checks with{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                instant feedback
              </span>
              .
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              We analyze the URL string only—no crawling of the target site—so your lookups remain safe and snappy.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** ---------- HOW IT WORKS (animated rail + sticky preview) ---------- */
/** ---------- HOW IT WORKS (fixed rail & cursor) ---------- */
/** ---------- HOW IT WORKS (dot now travels fully) ---------- */
function StickyShowcase({ id }) {
  // Entire section we observe for scroll progress
  const sectionRef = useRef(null);

  // The vertical rail whose height we measure
  const railRef = useRef(null);

  // Scroll progress of the section (0 -> 1)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    // Tweak the thresholds so it animates through the whole section smoothly
    offset: ["start 0.85", "end 0.15"],
  });

  // Measure the rail height so we can move the dot in pixels
  const [railH, setRailH] = useState(0);
  useEffect(() => {
    if (!railRef.current) return;
    const el = railRef.current;

    const setNow = () => setRailH(el.offsetHeight || 0);
    setNow();

    const ro = new ResizeObserver(setNow);
    ro.observe(el);
    window.addEventListener("resize", setNow);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setNow);
    };
  }, []);

  // 16px dot → move from 0 to (railHeight - 16)
  const dotTop = useTransform(scrollYProgress, [0, 1], [0, Math.max(0, railH - 16)]);

  // Some life on the sticky preview
  const cardRotate = useTransform(scrollYProgress, [0, 1], [0, 6]);
  const cardFloatY = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.25, 0.6]);

  const steps = [
    {
      n: "01",
      badge: "Privacy-first",
      title: "We parse the URL safely",
      body:
        "We never auto-fetch the page. We parse the host, path, query, entropy, and other signals locally.",
    },
    {
      n: "02",
      badge: "Fast",
      title: "Heuristics & model score",
      body:
        "Features like TLD, subdomains, symbols, and randomness feed a lightweight model to estimate risk.",
    },
    {
      n: "03",
      badge: "Transparent",
      title: "Explainable results",
      body:
        "We show exactly which factors raised the risk so users learn and trust the decision.",
    },
    {
      n: "04",
      badge: "Crowd wisdom",
      title: "Community signal (optional)",
      body:
        "Reviews help highlight trusted sites and warn others about suspicious patterns.",
    },
  ];

  return (
    <section
      id={id}
      ref={sectionRef}
      className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-2"
    >
      {/* LEFT: title + steps with rail */}
      <div className="relative">
        <Reveal>
          <h3 className="mb-1 text-2xl font-bold">How it works</h3>
          <p className="text-sm text-slate-300">
            Follow the steps as you scroll. The preview on the right reacts automatically.
          </p>
        </Reveal>

        {/* Rail STARTS under the heading, so cursor never overlaps the title */}
        <div ref={railRef} className="relative mt-6 pl-8">
          {/* vertical rail */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />

          {/* moving dot (bound to pixel top, not translateY) */}
          <motion.div
            style={{ top: dotTop }}
            className="absolute left-[6px] h-4 w-4 -translate-y-2 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.45)]"
          />

          {/* step cards */}
          <div className="space-y-4">
            {steps.map((s, i) => (
              <StepRow key={s.n} index={i} {...s} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: sticky preview card */}
      <div className="relative">
        <div className="sticky top-24">
          <motion.div
            style={{ rotate: cardRotate, y: cardFloatY }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur"
          >
            <motion.div
              style={{ opacity: glow }}
              className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl"
            />
            <motion.div
              style={{ opacity: glow }}
              className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl"
            />

            <div className="text-xs text-slate-300">Pinned preview</div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <span className="truncate">https://example-sale-discount.xyz/login</span>
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px]">Phishing</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <span className="truncate">https://www.mybank.com/login</span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px]">Safe</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
              <Badge>Subdomains</Badge>
              <Badge>Entropy</Badge>
              <Badge>HTTPS</Badge>
              <Badge>Symbols</Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* tiny breathing for the active step */}
      <style jsx>{`
        @keyframes pulseSoft {
          0%, 100% { opacity: 1; transform: translateY(0) }
          50% { opacity: .97; transform: translateY(-2px) }
        }
        .step-pulse { animation: pulseSoft 2.2s ease-in-out infinite }
      `}</style>
    </section>
  );
}

function StepRow({ n, badge, title, body, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-20% 0% -20% 0%", once: false });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -14 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0.4, x: -14 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
      className={`relative rounded-2xl border border-white/10 bg-white/5 p-4 ${inView ? "step-pulse" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">
          {badge}
        </span>
        <span className="text-[10px] text-slate-400">Step {n}</span>
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{body}</div>
    </motion.div>
  );
}


/* ---------- Header helpers ---------- */

function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === "loading") return <span className="text-xs opacity-70">…</span>;

  if (session?.user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="hidden sm:inline opacity-80">{session.user.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded bg-white/10 px-3 py-1 hover:bg-white/15"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <Link href="/login" className="rounded bg-white/10 px-3 py-1 hover:bg-white/15">
        Log in
      </Link>
      <Link href="/signup" className="rounded bg-cyan-500 px-3 py-1 font-semibold text-slate-900">
        Sign up
      </Link>
    </div>
  );
}

function LanguageMenu() {
  const { lang, setLang } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="rounded bg-white/10 px-2 py-1 text-xs outline-none hover:bg-white/15"
      title="Language"
    >
      <option value="en">EN</option>
      <option value="hi">हिं</option>
      <option value="gu">ગુ</option>
    </select>
  );
}

/* ---------- Small UI helpers ---------- */

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

function ScoreRing({ pct, ring }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const grad = `conic-gradient(${ring} ${clamped}%, rgba(255,255,255,0.08) ${clamped}% 100%)`;
  return (
    <div className="relative grid place-items-center" style={{ width: 92, height: 92 }}>
      <div className="absolute inset-0 rounded-full" style={{ background: grad }} />
      <div className="absolute inset-2 rounded-full bg-slate-950/80 backdrop-blur" />
      <div className="z-10 text-center">
        <div className="text-xl font-black">{clamped}%</div>
        <div className="text-[10px] text-slate-300">score</div>
      </div>
    </div>
  );
}

function Card({ title, value, accent }) {
  const ring =
    accent === "red"
      ? "ring-red-400/40"
      : accent === "emerald"
      ? "ring-emerald-400/40"
      : "ring-white/10";
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ring-1 ${ring} transition-transform duration-300 hover:-translate-y-0.5`}>
      <div className="text-xs text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Tip({ title, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="text-[11px] font-semibold text-slate-200">{title}</div>
      <div className="text-[11px] text-slate-300">{children}</div>
    </div>
  );
}

function CompactHistoryScroll({ rows, hasMore, loadingMore, onLoadMore }) {
  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore) onLoadMore?.();
      },
      { root: listRef.current, threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div ref={listRef} className="max-h-[360px] overflow-y-auto">
      <ul className="divide-y divide-white/10">
        {rows.map((r, i) => (
          <li
            key={`${r.ts || ""}-${r.url || i}`}
            className="grid grid-cols-[150px,1fr,110px,80px] px-3 py-2 text-[13px] hover:bg-white/5"
          >
            <div className="text-slate-300">{r.ts ? new Date(r.ts).toLocaleString() : "-"}</div>
            <div className="truncate pr-2" title={r.reasons ? r.reasons.join(", ") : r.url}>
              {r.url ? (
                <Link className="text-cyan-300 underline" href={r.url} target="_blank" rel="noreferrer">
                  {r.url}
                </Link>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>
            <div>
              {r.label === "phishing" ? (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px]">Phishing</span>
              ) : (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px]">Safe</span>
              )}
            </div>
            <div className="text-slate-200">
              {typeof r.score === "number" ? `${Math.round(r.score * 100)}%` : "-"}
            </div>
          </li>
        ))}
        <li className="px-3 py-2 text-center text-xs text-slate-400">
          {loadingMore ? "Loading…" : hasMore ? <span ref={sentinelRef} /> : "End of results"}
        </li>
      </ul>
    </div>
  );
}

function ReviewForm({ url, onDone }) {
  const { t } = useI18n();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setOk("");
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, stars, text, name }),
      });
      setText("");
      setName("");
      setStars(5);
      setOk("✓");
      onDone?.();
    } catch {
      setOk("×");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-slate-200">{t("misc.rateThisSite")}</div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <StarInput value={stars} onChange={setStars} />
        <input
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-sm outline-none"
        />
      </div>
      <textarea
        placeholder="What did you notice?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-2 w-full rounded bg-white/10 px-2 py-2 text-sm outline-none"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          disabled={submitting}
          className="rounded bg-cyan-500 px-3 py-1 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          {submitting ? t("actions.submitting") : t("actions.submitReview")}
        </button>
        {ok && <span className="text-xs text-slate-300">{ok}</span>}
      </div>
    </form>
  );
}

function StarInput({ value = 5, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className="text-yellow-400"
          title={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={n <= value ? "" : "opacity-40"}
          >
            <path d="M10 15.27l-5.18 3.04 1.64-5.64L1 7.97l5.81-.5L10 2l3.19 5.47 5.81.5-5.46 4.7 1.64 5.64z" />
          </svg>
        </button>
      ))}
      <span className="ml-1 text-xs text-slate-300">{value}/5</span>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] tracking-wide">
      {children}
    </span>
  );
}

function HeroPanel() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
        <Badge>URL entropy</Badge>
        <Badge>Subdomains</Badge>
        <Badge>TLD</Badge>
        <Badge>Symbols</Badge>
        <Badge>HTTPS</Badge>
      </div>

      <div className="relative mt-6 grid place-items-center">
        <div className="absolute h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl animate-glow" />
        <div className="absolute h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl animate-glow" />
        <div className="relative grid place-items-center">
          <div className="h-40 w-40 rounded-full border border-white/15" />
          <div className="absolute h-44 w-44 rounded-full border border-white/10 animate-spin-slow" />
          <div className="absolute h-1 w-1 -translate-y-24 transform rounded-full bg-white/70 shadow" />
        </div>

        <div className="relative z-10 mt-8 w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur">
          <div className="text-xs text-slate-300">Live risk preview</div>
          <div className="mt-2 flex items-center gap-3">
            <MiniScore pct={82} />
            <div className="text-sm">
              <div className="font-semibold text-emerald-300">Likely safe</div>
              <div className="text-slate-300/90">Based on URL structure</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 rounded-xl bg-gradient-to-tr from-cyan-300/30 to-emerald-300/30 blur-2xl animate-float" />
    </div>
  );
}

function MiniScore({ pct = 82 }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const ring = `conic-gradient(#34d399 ${clamped}%, rgba(255,255,255,.12) ${clamped}% 100%)`;
  return (
    <div className="relative grid place-items-center" style={{ width: 60, height: 60 }}>
      <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
      <div className="absolute inset-1 rounded-full bg-slate-950/80" />
      <div className="z-10 text-xs font-bold">{clamped}%</div>
    </div>
  );
}

/* ---------- tiny utils ---------- */
function percent(part, total) {
  const d = Math.max(1, Number(total || 0));
  return Math.round((Number(part || 0) / d) * 100);
}
function tryHost(raw) {
  if (!raw || typeof raw !== "string") return "";
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}
