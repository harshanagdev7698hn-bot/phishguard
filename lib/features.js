// lib/features.js
function shannonEntropy(str) {
  if (!str) return 0;
  const map = new Map();
  for (const ch of str) map.set(ch, (map.get(ch) || 0) + 1);
  const len = str.length;
  let ent = 0;
  for (const [, c] of map) {
    const p = c / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}
const suspiciousTlds = new Set([
  "zip","country","kim","cricket","link","biz","work","gq","tk","ml","cf","ru","cn","pw","top","xyz","live","rest","fit","loan","men",
]);

function looksLikeIP(hostname) {
  return /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

export function urlFeatures(raw) {
  try {
    const url = new URL(raw);
    const hostname = url.hostname || "";
    const pathname = url.pathname || "";
    const search = url.search || "";
    const full = url.href;
    const prot = (url.protocol || "").replace(":", "");
    const tld = hostname.includes(".") ? hostname.split(".").pop().toLowerCase() : "";
    const fqdnParts = hostname.split(".");
    const subdomainCount = Math.max(0, fqdnParts.length - 2);

    const counts = {
      len: full.length,
      dots: (full.match(/\./g) || []).length,
      hyphens: (full.match(/-/g) || []).length,
      at: (full.match(/@/g) || []).length,
      digits: (full.match(/\d/g) || []).length,
      slashes: (full.match(/\//g) || []).length,
      params: (search.match(/=/g) || []).length,
      qmarks: (full.match(/\?/g) || []).length,
      ampersands: (full.match(/&/g) || []).length,
    };

    const hasHttps = prot === "https" ? 1 : 0;
    const hasPort = url.port ? 1 : 0;
    const hasIP = looksLikeIP(hostname) ? 1 : 0;
    const suspTld = suspiciousTlds.has(tld) ? 1 : 0;
    const pathDepth = (pathname.match(/\//g) || []).length;
    const entropy = shannonEntropy(full);

    const meta = { tld, hasHttps, hasIP, suspTld, subdomainCount, pathDepth, counts, entropy };
    return { meta };
  } catch {
    return { error: "Invalid URL" };
  }
}
