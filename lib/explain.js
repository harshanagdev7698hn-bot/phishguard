// lib/explain.js
export function reasonsFromMeta(meta) {
  const r = [];
  const { counts, hasHttps, hasIP, suspTld, subdomainCount, pathDepth, entropy } = meta;
  if (!hasHttps) r.push("No HTTPS (uses http)");
  if (hasIP) r.push("IP address used instead of domain");
  if (suspTld) r.push("Suspicious TLD");
  if (subdomainCount >= 3) r.push("Too many subdomains");
  if (counts.hyphens >= 3) r.push("Many hyphens");
  if (counts.at > 0) r.push("Contains @ symbol");
  if (counts.qmarks > 1 || counts.ampersands > 3) r.push("Complex query parameters");
  if (pathDepth >= 4) r.push("Deep path");
  if (counts.len >= 100) r.push("Unusually long URL");
  if (entropy >= 4.0) r.push("High randomness in URL");
  if (r.length === 0) r.push("No obvious red flags");
  return r;
}
