"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Hero visualization:
 * - Two animated wave strokes
 * - A glowing dot that travels along the wave via CSS motion-path
 * - No React warnings (offsetDistance is in style on an HTML element)
 * - Dot mounts on client to avoid hydration mismatch
 */
export default function HeroViz({ className = "" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Keep the path fixed-size for exact motion-path coordinates
  const WAVE_PATH =
    "M40,110 C 110,60 160,160 230,110 S 330,160 360,110";

  return (
    <div className={`relative ${className}`}>
      <div className="relative mx-auto" style={{ width: 360, height: 220 }}>
        <svg
          viewBox="0 0 360 220"
          className="absolute inset-0 h-[220px] w-[360px]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="waveStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* back faint wave */}
          <motion.path
            d={WAVE_PATH}
            fill="none"
            stroke="url(#waveStroke)"
            strokeWidth="2"
            strokeOpacity="0.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* animated dash wave */}
          <motion.path
            d={WAVE_PATH}
            fill="none"
            stroke="url(#waveStroke)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="12 10"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -44 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* moving glowing dot */}
        {mounted && (
          <motion.div
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 10,
              height: 10,
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(52,211,153,1) 60%, rgba(52,211,153,0.2) 100%)",
              boxShadow:
                "0 0 18px rgba(52,211,153,0.55), 0 0 36px rgba(103,232,249,0.45)",
              // must be in STYLE, not as an SVG prop
              offsetPath: `path("${WAVE_PATH}")`,
              offsetDistance: "0%",
              offsetRotate: "0deg",
            }}
          />
        )}
      </div>

      {/* soft background blobs */}
      <div className="pointer-events-none absolute -left-10 -top-8 h-28 w-28 rounded-full bg-cyan-400/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-8 h-28 w-28 rounded-full bg-emerald-400/25 blur-2xl" />
    </div>
  );
}
