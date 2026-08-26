"use client";

import React from "react";
import Link from "next/link";
import { Input, Button } from "@streamline/ui";
import { Eye, EyeOff, Check } from "lucide-react";

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-slate-700",
  "bg-rose-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-emerald-500",
];

function scorePassword(value: string) {
  if (value.length < 6) return 0;
  let score = 1;
  if (value.length >= 10) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

export default function SignupPage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pwdVisible, setPwdVisible] = React.useState(false);
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);

  const strength = scorePassword(password);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString().trim() || "";
    const email = formData.get("email")?.toString().trim() || "";
    const pass = formData.get("password")?.toString() || "";
    const confirm = formData.get("confirmPassword")?.toString() || "";

    if (name.length < 2) {
      setError("Please tell us your name.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (pass.length < 6) {
      setError("Your password needs to be at least 6 characters.");
      return;
    }

    if (pass !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    if (!accepted) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    // fake delay to simulate account creation
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);

    // On success, redirect or call your auth logic
    // For now just console and reset
    console.log("signed up", { name, email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center px-6 py-12">
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

          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-indigo-400" />
              <span>Go live in minutes, no studio required</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-indigo-400" />
              <span>Low-latency chat that keeps up with your room</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-indigo-400" />
              <span>Analytics that show what your audience loves</span>
            </li>
          </ul>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-900/30 backdrop-blur border border-slate-700 shadow-lg">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="mt-1 text-sm text-slate-400">Start broadcasting on LiveCast in a few minutes</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="sr-only" htmlFor="name">Full name</label>
                <Input id="name" name="name" type="text" autoComplete="name" className="rounded-2xl px-4 text-base bg-slate-900/40 border-slate-600" placeholder="Your name" />
              </div>

              <div>
                <label className="sr-only" htmlFor="email">Email</label>
                <Input id="email" name="email" type="email" autoComplete="email" className="rounded-2xl px-4 text-base bg-slate-900/40 border-slate-600" placeholder="you@studio.com" />
              </div>

              <div>
                <div className="relative">
                  <label className="sr-only" htmlFor="password">Password</label>
                  <Input
                    id="password"
                    name="password"
                    type={pwdVisible ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl px-4 pr-11 text-base bg-slate-900/40 border-slate-600"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setPwdVisible((v) => !v)}
                    aria-label={pwdVisible ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                  >
                    {pwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {password ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex flex-1 gap-1" aria-hidden>
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${i < strength ? STRENGTH_COLORS[strength] : "bg-slate-700"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{STRENGTH_LABELS[strength]}</span>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="confirmPassword">Confirm password</label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={confirmVisible ? "text" : "password"}
                  autoComplete="new-password"
                  className="rounded-2xl px-4 pr-11 text-base bg-slate-900/40 border-slate-600"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setConfirmVisible((v) => !v)}
                  aria-label={confirmVisible ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                >
                  {confirmVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded bg-slate-700 border-slate-600"
                />
                <span>
                  I agree to the <Link href="#" className="text-indigo-400 hover:underline">Terms</Link> and{" "}
                  <Link href="#" className="text-indigo-400 hover:underline">Privacy Policy</Link>
                </span>
              </label>

              {error ? <div className="text-sm text-rose-400">{error}</div> : null}

              <Button type="submit" variant="primary" className="w-full" loading={loading}>Create account</Button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-slate-700 flex-1" />
                <div className="text-xs uppercase text-slate-500">Or continue with</div>
                <div className="h-px bg-slate-700 flex-1" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="ghost">Google</Button>
                <Button type="button" variant="ghost">GitHub</Button>
              </div>

              <p className="mt-3 text-sm text-center text-slate-400">Already have an account? <Link href="/login" className="text-indigo-400 hover:underline">Sign in</Link></p>
            </form>

            <div className="mt-6 text-xs text-center text-slate-500">We&apos;ll never share your email. Cancel your account any time.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
