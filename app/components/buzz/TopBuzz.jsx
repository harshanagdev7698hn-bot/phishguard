// app/components/buzz/TopBuzz.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const fetchJSON = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const hostnameOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

const Table = ({ head, children }) => (
  <div className="overflow-hidden rounded-xl border border-white/10">
    <table className="min-w-full text-sm">
      <thead className="bg-white/5">
        <tr>
          {head.map((h, i) => (
            <th key={i} className="text-left font-medium text-slate-200 px-3 py-2.5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10 bg-white/2.5">{children}</tbody>
    </table>
  </div>
);

const StarRow = ({ value = 0, outOf = 5 }) => {
  const on = Math.round(Math.max(0, Math.min(outOf, value)));
  return (
    <div className="flex gap-1">
      {Array.from({ length: outOf }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={"h-4 w-4 " + (i < on ? "fill-emerald-400" : "fill-slate-600")}>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
};

const badge = (text, tone) =>
  ({
    danger:
      "inline-flex items-center rounded-full bg-red-500/15 text-red-300 px-2.5 py-0.5 text-xs font-medium",
    success:
      "inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 text-xs font-medium",
  }[tone] + ` whitespace-nowrap`);

const Card = ({ title, right, children, className = "" }) => (
  <div className={"rounded-2xl border border-white/10 bg-slate-900/40 shadow-xl shadow-black/20 backdrop-blur " + className}>
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
      <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
      {right}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

export default function TopBuzz() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchJSON(`/api/history?limit=200&offset=0`);
        if (!alive) return;
        setRows(data.rows || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const threats = useMemo(
    () =>
      (rows || [])
        .filter((r) => r.label === "phishing")
        .slice(0, 12)
        .map((r) => ({ host: hostnameOf(r.url), ts: r.ts })),
    [rows]
  );

  const popular = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const host = hostnameOf(r.url);
      const m = map.get(host) || { host, total: 0, safe: 0, phishing: 0 };
      m.total++;
      if (r.label === "safe") m.safe++;
      else if (r.label === "phishing") m.phishing++;
      map.set(host, m);
    }
    return [...map.values()]
      .filter((m) => m.total >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map((m) => {
        const ratio = m.safe / Math.max(1, m.total);
        return { ...m, stars: Math.round(ratio * 5), verdict: ratio >= 0.7 ? "Safe" : "Warning" };
      });
  }, [rows]);

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Top Buzz</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          title="Latest Site Threats"
          right={<Link href="/community" className="text-sky-300 hover:underline">See More</Link>}
        >
          <Table head={["Site Name", "Last Updated", "Community Rating", "Our Verdict"]}>
            {loading && <tr><td colSpan={4} className="px-3 py-2.5 text-slate-400">Loading…</td></tr>}
            {!loading && threats.map((t, i) => (
              <tr key={t.host + i} className="hover:bg-white/5">
                <td className="px-3 py-2.5">
                  <Link href={`https://${t.host}`} target="_blank" className="text-sky-300 hover:underline">
                    {t.host}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate-300">{new Date(t.ts).toLocaleString()}</td>
                <td className="px-3 py-2.5"><StarRow value={1} /></td>
                <td className="px-3 py-2.5"><span className={badge("Warning", "danger")}>Warning</span></td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card
          title="Popular Sites"
          right={<Link href="/community" className="text-sky-300 hover:underline">See More</Link>}
        >
          <Table head={["Site Name", "Total Reviews", "Community Rating", "Our Verdict"]}>
            {loading && <tr><td colSpan={4} className="px-3 py-2.5 text-slate-400">Loading…</td></tr>}
            {!loading && popular.map((p) => (
              <tr key={p.host} className="hover:bg-white/5">
                <td className="px-3 py-2.5">
                  <Link href={`https://${p.host}`} target="_blank" className="text-sky-300 hover:underline">
                    {p.host}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-slate-300">{p.total}</td>
                <td className="px-3 py-2.5"><StarRow value={p.stars} /></td>
                <td className="px-3 py-2.5">
                  <span className={p.verdict === "Safe" ? badge("Safe", "success") : badge("Warning", "danger")}>
                    {p.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </section>
  );
}
