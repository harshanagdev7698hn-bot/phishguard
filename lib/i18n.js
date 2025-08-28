// lib/i18n.js
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const dict = {
  en: {
    brand: { name: "PhishGuard", tagline: "Heuristic URL Checker" },
    actions: { check: "Check", submitReview: "Submit Review", submitting: "Submitting…" },
    sections: {
      checkTitle: "Check any website",
      resultTitle: "Result",
      quickStats: "Quick Stats",
      recentHistory: "Recent History",
      community: "Community",
      popularSites: "Popular Sites",
      latestReviews: "Latest Reviews",
      total: "Total URLs checked",
    },
    result: {
      pastePrompt: "Paste a URL and click",
      confidence: "Confidence score",
      why: "Why this verdict",
      features: "Feature details",
    },
    tips: {
      https: "Prefers secure (https) sites",
      tlds: "Flags .tk, .gq, .xyz and similar",
      symbols: "Warns about @, many hyphens, long length",
      ip: "IP-based URLs are risky",
    },
    table: { time: "Time", url: "URL", label: "Label", score: "Score", reasons: "Reasons" },
    misc: { seeAll: "See all", seeMore: "See more", rateThisSite: "Rate this site" },
  },
  hi: {
    brand: { name: "PhishGuard", tagline: "सुरक्षित URL जाँच" },
    actions: { check: "जाँचें", submitReview: "समीक्षा भेजें", submitting: "भेजा जा रहा है…" },
    sections: {
      checkTitle: "किसी भी वेबसाइट की जाँच करें",
      resultTitle: "परिणाम",
      quickStats: "त्वरित आँकड़े",
      recentHistory: "हाल की हिस्ट्री",
      community: "समुदाय",
      popularSites: "लोकप्रिय साइटें",
      latestReviews: "नवीनतम समीक्षाएँ",
      total: "कुल जाँची गई URLs",
    },
    result: {
      pastePrompt: "URL पेस्ट करें और क्लिक करें",
      confidence: "विश्वास स्कोर",
      why: "यह निर्णय क्यों",
      features: "फ़ीचर विवरण",
    },
    tips: {
      https: "सुरक्षित (https) साइटें बेहतर हैं",
      tlds: ".tk, .gq, .xyz जैसे TLD फ़्लैग",
      symbols: "@, बहुत से हाइफ़न, लंबाई पर चेतावनी",
      ip: "IP को डोमेन के रूप में उपयोग करना जोखिमभरा है",
    },
    table: { time: "समय", url: "URL", label: "लेबल", score: "स्कोर", reasons: "कारण" },
    misc: { seeAll: "सभी देखें", seeMore: "और देखें", rateThisSite: "साइट को रेट करें" },
  },
  gu: {
    brand: { name: "PhishGuard", tagline: "સુરક્ષિત URL ચેકર" },
    actions: { check: "ચેક કરો", submitReview: "સમીક્ષા મોકલો", submitting: "મોકલાઇ રહ્યું છે…" },
    sections: {
      checkTitle: "કોઈપણ વેબસાઇટ ચેક કરો",
      resultTitle: "પરિણામ",
      quickStats: "ઝડપી આંકડા",
      recentHistory: "તાજેતરનો ઇતિહાસ",
      community: "કમ્યુનિટી",
      popularSites: "લોકપ્રિય સાઇટ્સ",
      latestReviews: "તાજેતરની સમીક્ષાઓ",
      total: "કુલ તપાસેલી URLs",
    },
    result: {
      pastePrompt: "URL પેસ્ટ કરો અને ક્લિક કરો",
      confidence: "વિશ્વાસ સ્કોર",
      why: "આ નિર્ણય કેમ",
      features: "ફીચર વિગતો",
    },
    tips: {
      https: "સુરક્ષિત (https) સાઇટ્સ સારી",
      tlds: ".tk, .gq, .xyz જેવા TLD ફ્લેગ",
      symbols: "@, ઘણા હાઇફન, લાંબાઈ અંગે ચેતવણી",
      ip: "IP ને ડોમેિન તરીકે ઉપયોગ કરવું જોખમી",
    },
    table: { time: "સમય", url: "URL", label: "લેબલ", score: "સ્કોર", reasons: "કારણો" },
    misc: { seeAll: "બધું જુઓ", seeMore: "વધુ જુઓ", rateThisSite: "સાઇટ રેટ કરો" },
  },
};

const I18nCtx = createContext(null);

function pickDefaultLang() {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("lang");
  if (saved && dict[saved]) return saved;
  const nav = (navigator.language || "en").slice(0, 2);
  return dict[nav] ? nav : "en";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(pickDefaultLang);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useMemo(() => {
    const active = dict[lang] || dict.en;
    return (key, vars) => {
      const parts = String(key).split(".");
      let cur = active;
      for (const p of parts) cur = cur?.[p];
      let out = cur ?? key;
      if (vars && typeof out === "string") {
        out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
      }
      return out;
    };
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (v) => {
        if (!dict[v]) return;
        localStorage.setItem("lang", v);
        setLang(v);
      },
      t,
    }),
    [lang, t]
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
