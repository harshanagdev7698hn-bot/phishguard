"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// (Do NOT export revalidate here; it's server-only)
// You may keep dynamic if you like, but it's optional for a client page.
// export const dynamic = "force-dynamic";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const sp = useSearchParams();
  const justSignedUp = sp.get("signup") === "1";

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("Invalid email or password");
    else router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 border rounded-lg p-4 bg-slate-900/60">
        <h1 className="text-xl font-semibold">Log in</h1>
        {justSignedUp && <div className="text-green-400 text-sm">Account created. Please log in.</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <input
          className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full rounded bg-blue-600 hover:bg-blue-500 py-2">Log in</button>
        <div className="text-sm text-slate-300">
          No account? <a className="underline" href="/signup">Sign up</a>
        </div>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
