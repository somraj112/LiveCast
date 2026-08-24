"use client";

import React from "react";
import Link from "next/link";
import { Input } from "@streamline/ui";
import { Button } from "@streamline/ui";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pwdVisible, setPwdVisible] = React.useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // fake delay to simulate auth
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    // naive validation demo
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email")?.toString() || "";
    const pass = formData.get("password")?.toString() || "";

    if (!email.includes("@") || pass.length < 6) {
      setError("Please provide a valid email and a password with 6+ characters.");
      return;
    }

    // On success, redirect or call your auth logic
    // For now just console and reset
    console.log("signed in", { email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:flex flex-col gap-6 p-8 rounded-2xl bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/40 backdrop-blur border border-slate-800">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">LiveCast</h1>
            <p className="mt-2 text-slate-400">Broadcast. Connect. Create.</p>
          </div>

          <div className="mt-6 flex-1 flex items-center justify-center">
            <div className="w-full h-64 bg-gradient-to-tr from-indigo-600/30 via-pink-600/20 to-transparent rounded-xl border border-slate-800 flex items-center justify-center">
              <svg className="h-32 w-32 opacity-80" viewBox="0 0 24 24" fill="none" stroke="url(#g)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M16 11.37a4 4 0 1 0-8 0v1.63" />
              </svg>
            </div>
          </div>

          <p className="text-sm text-slate-500">Secure, low-latency streaming tools built for creators and communities. Works well in dark-mode layouts.</p>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-900/30 backdrop-blur border border-slate-700 shadow-lg">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-400">Sign in to continue to your dashboard</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="sr-only" htmlFor="email">Email</label>
                <Input id="email" name="email" type="email" className="rounded-2xl px-4 text-base bg-slate-900/40 border-slate-600" placeholder="you@studio.com" />
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="password">Password</label>
                <Input id="password" name="password" type={pwdVisible ? "text" : "password"} className="rounded-2xl px-4 text-base bg-slate-900/40 border-slate-600" placeholder="Enter your password" />
                <button
                  type="button"
                  onClick={() => setPwdVisible((v) => !v)}
                  aria-label={pwdVisible ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                >
                  {pwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="inline-flex items-center gap-2 text-slate-300">
                  <input type="checkbox" className="h-4 w-4 rounded bg-slate-700 border-slate-600" />
                  <span>Remember me</span>
                </label>

                <Link href="#" className="text-indigo-400 hover:underline">Forgot?</Link>
              </div>

              {error ? <div className="text-sm text-rose-400">{error}</div> : null}

              <Button type="submit" variant="primary" className="w-full" loading={loading}>Sign in</Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-slate-700 flex-1" />
                <div className="text-xs uppercase text-slate-500">Or continue with</div>
                <div className="h-px bg-slate-700 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="ghost">Google</Button>
                <Button type="button" variant="ghost">GitHub</Button>
              </div>

              <p className="mt-3 text-sm text-center text-slate-400">New to LiveCast? <Link href="#" className="text-indigo-400 hover:underline">Create an account</Link></p>
            </form>

            <div className="mt-6 text-xs text-center text-slate-500">By signing in you agree to the <Link href="#" className="text-indigo-400">Terms</Link> and <Link href="#" className="text-indigo-400">Privacy Policy</Link>.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
