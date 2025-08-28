"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Signup failed");
      return;
    }
    router.push("/login?signup=1");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 border rounded-lg p-4 bg-slate-900/60">
        <h1 className="text-xl font-semibold">Create account</h1>
        {err && <div className="text-red-400 text-sm">{err}</div>}

        <input
          className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
          placeholder="you@example.com"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 px-3 py-2 outline-none"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button className="w-full rounded bg-blue-600 hover:bg-blue-500 py-2">Sign up</button>

        <div className="text-sm text-slate-300">
          Already have an account? <a className="underline" href="/login">Log in</a>
        </div>
      </form>
    </main>
  );
}
