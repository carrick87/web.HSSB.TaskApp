"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/branding/BrandMark";
import type { CompanyProfile } from "@/lib/company/constants";
import { DEFAULT_COMPANY } from "@/lib/company/constants";

const HARISON_EMAIL_SUFFIX = "@harrisons.com.my";

type Mode = "signin" | "signup";

export default function LoginForm({ company = DEFAULT_COMPANY }: { company?: CompanyProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!login.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setLoading(false);
        return;
      }
      if (data.mustChangePassword) {
        router.push("/profile?changePassword=1");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signupUsername.trim() || signupUsername.trim().length < 2) {
      setError("Username is required (at least 2 characters).");
      return;
    }
    if (signupEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setError("Password is required (at least 6 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername.trim(),
          ...(signupEmail.trim() && { email: signupEmail.trim().toLowerCase() }),
          password: signupPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Sign up failed.");
        setLoading(false);
        return;
      }
      router.push(data.needsOnboarding ? "/onboarding/create-org" : redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <BrandMark company={company} size="lg" showName={false} />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-1000 mb-1">
          {company.name}
        </h1>
        <p className="text-neutral-700 text-sm">
          {company.tagline ?? DEFAULT_COMPANY.tagline}
        </p>
      </div>

      <div className="bg-white rounded-atlassian shadow-atlassian-md p-8">
        <div className="flex rounded-atlassian bg-neutral-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 rounded-atlassian py-2 text-sm font-medium transition-all ${
              mode === "signin"
                ? "bg-white text-neutral-1000 shadow-atlassian-sm"
                : "text-neutral-700 hover:text-neutral-900"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 rounded-atlassian py-2 text-sm font-medium transition-all ${
              mode === "signup"
                ? "bg-white text-neutral-1000 shadow-atlassian-sm"
                : "text-neutral-700 hover:text-neutral-900"
            }`}
          >
            Sign up
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="login" className="atlassian-label">
                Username
              </label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Enter your username"
                className="atlassian-input"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="atlassian-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="atlassian-input"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="bg-atlassian-red-light border border-red-200 rounded-atlassian px-3 py-2">
                <p className="text-sm text-atlassian-red">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-atlassian bg-brand-700 text-white font-medium hover:bg-brand-800 active:bg-brand-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-atlassian-sm"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="signup-username" className="atlassian-label">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="atlassian-input"
                autoComplete="username"
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="atlassian-label">
                Email (optional)
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="you@company.com"
                className="atlassian-input"
                autoComplete="email"
              />
              <p className="mt-1.5 text-xs text-neutral-700">Used for invites and recovery. Sign-in uses your username.</p>
            </div>
            <div>
              <label htmlFor="signup-password" className="atlassian-label">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="atlassian-input"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="bg-atlassian-red-light border border-red-200 rounded-atlassian px-3 py-2">
                <p className="text-sm text-atlassian-red">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-atlassian bg-brand-700 text-white font-medium hover:bg-brand-800 active:bg-brand-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-atlassian-sm"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
            <p className="text-xs text-neutral-700 text-center">
              By signing up you agree to our{" "}
              <Link href="/terms" className="text-brand-700 hover:underline">Terms</Link> and{" "}
              <Link href="/privacy" className="text-brand-700 hover:underline">Privacy</Link> (placeholders).
            </p>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-neutral-700">
        <Link href="/" className="text-brand-700 hover:text-brand-800 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
