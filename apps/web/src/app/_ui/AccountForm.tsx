"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button, Input, PasswordInput } from "@streamline/ui";
import { AuthApiError, login, register } from "@/lib/auth";

export default function AccountForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const username = String(data.get("username") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    if (signup && username.length < 3) {
      setError("Enter a username with at least three characters.");
      return;
    }
    if (signup && password !== data.get("confirm")) {
      setError("The passwords don’t match. Re-enter the confirmation.");
      return;
    }

    setLoading(true);
    try {
      if (signup) await register({ username, email, password });
      else await login({ email, password });
      form.reset();
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : "LiveCast could not sign you in. Try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main id="content" className="wrap account">
      <aside className="account-poster">
        <span className="eyebrow">LiveCast / Independent broadcasts</span>
        <p>
          Find your
          <br />
          <em>frequency.</em>
        </p>
        <div className="account-deck" />
        <span className="eyebrow">
          Studio Meridian &nbsp; / &nbsp; Channel 01
        </span>
      </aside>
      <section className="account-form">
        <span className="eyebrow">
          <i className="signal-dot" /> Backstage access
        </span>
        <h1>{signup ? "Join LiveCast." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Create your profile for the broadcast guide."
            : "Sign in to your LiveCast profile."}
        </p>
          <form onSubmit={submit} onChange={() => setError("")} aria-busy={loading}>
            {signup && (
              <label>
                Username
                <Input
                  name="username"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-zA-Z0-9_]+"
                  autoComplete="nickname"
                  placeholder="your_on_air_name"
                />
              </label>
            )}
            <label>
              Email address
              <Input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <div>
              <label htmlFor="account-password">Password</label>
              <PasswordInput
                id="account-password"
                name="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "At least 8 characters" : "Enter your password"
                }
              />
            </div>
            {signup && (
              <div>
                <label htmlFor="confirm-password">Confirm password</label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </div>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button type="submit" className="account-submit" loading={loading}>
              {signup ? "Create profile" : "Log in"}{" "}
              <ArrowRight size={16} />
            </Button>
            <small>Your refresh session is secured in an HTTP-only cookie.</small>
          </form>
        <div className="switch-account">
          {signup ? "Already have a profile?" : "New to LiveCast?"}{" "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Join LiveCast"} →
          </Link>
        </div>
      </section>
    </main>
  );
}
