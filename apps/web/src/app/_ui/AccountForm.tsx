"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Input, PasswordInput } from "@streamline/ui";

export default function AccountForm({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState(""),
    [done, setDone] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    if (signup && String(data.get("name")).trim().length < 2) {
      setError("Enter a display name with at least two characters.");
      return;
    }
    if (signup && data.get("password") !== data.get("confirm")) {
      setError("The passwords don’t match. Re-enter the confirmation.");
      return;
    }
    form.reset();
    setDone(true);
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
        {done ? (
          <div role="status" className="form-notice">
            <strong>Demo form complete.</strong>
            <p>No account or session was created.</p>
            <Link href="/">Return to Discover →</Link>
          </div>
        ) : (
          <form onSubmit={submit} onChange={() => setError("")}>
            {signup && (
              <label>
                Display name
                <Input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="nickname"
                  placeholder="Your on-air name"
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
                minLength={6}
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "At least 6 characters" : "Enter your password"
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
            <Button type="submit" className="account-submit">
              {signup ? "Create demo profile" : "Log in to demo"}{" "}
              <ArrowRight size={16} />
            </Button>
            <small>Demo form only. Use sample details.</small>
          </form>
        )}
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
