"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { IncomingEmail } from "./api/webhook/route";

type ViewState = "inbox" | "reading";

const POLL_INTERVAL = 8000;

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [emails, setEmails] = useState<IncomingEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<ViewState>("inbox");
  const [selected, setSelected] = useState<IncomingEmail | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [storageError, setStorageError] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emailRef = useRef<string>("");

  const fetchInbox = useCallback(async (addr: string) => {
    if (!addr) return;
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (data.error && res.status === 503) {
        setStorageError(true);
      } else {
        setStorageError(false);
        setEmails(data.emails || []);
      }
      setLastChecked(new Date());
    } catch {
      // silently ignore network errors during polling
    }
  }, []);

  const generateEmail = useCallback(async () => {
    setGenerating(true);
    setEmails([]);
    setSelected(null);
    setView("inbox");
    setStorageError(false);
    try {
      const res = await fetch("/api/generate");
      const data = await res.json();
      setEmail(data.email);
      emailRef.current = data.email;
      await fetchInbox(data.email);
    } finally {
      setGenerating(false);
    }
  }, [fetchInbox]);

  const refreshInbox = useCallback(async () => {
    if (!emailRef.current) return;
    setLoading(true);
    await fetchInbox(emailRef.current);
    setLoading(false);
  }, [fetchInbox]);

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInbox = async () => {
    if (!email) return;
    await fetch(`/api/delete/${encodeURIComponent(email)}`, { method: "DELETE" });
    setEmails([]);
    setSelected(null);
    setView("inbox");
  };

  useEffect(() => {
    generateEmail();
  }, []);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!email) return;
    pollingRef.current = setInterval(() => {
      fetchInbox(emailRef.current);
    }, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [email, fetchInbox]);

  const openEmail = (msg: IncomingEmail) => {
    setSelected(msg);
    setView("reading");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 relative z-10">
      {/* Header */}
      <header className="w-full max-w-2xl mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #38bdf8, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            zekoro.fun
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Instant disposable email. No signup. No tracking.
        </p>
      </header>

      {/* Email Card */}
      <div className="w-full max-w-2xl rounded-2xl p-6 mb-4 glow-blue" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-medium mb-3 uppercase tracking-widest" style={{ color: "#64748b" }}>Your address</p>

        <div className="flex items-center gap-3">
          <div className="flex-1 email-tag rounded-xl px-4 py-3 font-mono text-sm overflow-x-auto whitespace-nowrap" style={{ color: "#f1f5f9" }}>
            {generating ? (
              <span className="shimmer inline-block w-48 h-4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
            ) : (
              email || "—"
            )}
          </div>

          <button
            onClick={copyEmail}
            disabled={!email || generating}
            title="Copy to clipboard"
            className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: copied ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: copied ? "#38bdf8" : "#94a3b8",
            }}
          >
            {copied ? (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={generateEmail}
            disabled={generating}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            {generating ? "Generating…" : "New address"}
          </button>

          <button
            onClick={refreshInbox}
            disabled={loading || !email}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#94a3b8",
            }}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
            Refresh
          </button>

          {emails.length > 0 && (
            <button
              onClick={clearInbox}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#f87171",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Clear
            </button>
          )}
        </div>

        {lastChecked && (
          <p className="mt-3 text-xs" style={{ color: "#475569" }}>
            Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every {POLL_INTERVAL / 1000}s
          </p>
        )}
      </div>

      {/* Inbox Panel */}
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", minHeight: 320 }}>
        {/* Inbox / Reader toggle */}
        {view === "reading" && selected ? (
          <EmailReader email={selected} onBack={() => setView("inbox")} formatTime={formatTime} />
        ) : (
          <InboxPanel
            emails={emails}
            loading={loading || generating}
            storageError={storageError}
            onOpen={openEmail}
            formatTime={formatTime}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs" style={{ color: "#334155" }}>
        <p>Emails auto-delete after 24 hours · zekoro.fun</p>
        <p className="mt-1">
          Deploy to{" "}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-400 transition-colors">
            Vercel
          </a>{" "}
          · Built with Next.js
        </p>
      </footer>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function InboxPanel({
  emails,
  loading,
  storageError,
  onOpen,
  formatTime,
}: {
  emails: IncomingEmail[];
  loading: boolean;
  storageError: boolean;
  onOpen: (e: IncomingEmail) => void;
  formatTime: (iso: string) => string;
}) {
  return (
    <div>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>Inbox</span>
          {emails.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
              {emails.length}
            </span>
          )}
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#475569" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: "#38bdf8" }} />
            Checking…
          </div>
        )}
      </div>

      {storageError ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.1)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#fbbf24" }}>Storage not configured</p>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
              Add <code className="font-mono px-1 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>UPSTASH_REDIS_REST_URL</code> and{" "}
              <code className="font-mono px-1 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>UPSTASH_REDIS_REST_TOKEN</code> to your Vercel environment variables.
            </p>
          </div>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.06)", border: "1px dashed rgba(56,189,248,0.2)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: "#475569" }}>No emails yet</p>
            <p className="text-xs" style={{ color: "#334155" }}>
              Copy your address above and use it anywhere.
              <br />Messages appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <ul>
          {emails.map((msg, i) => (
            <li
              key={msg.id}
              onClick={() => onOpen(msg)}
              className="inbox-row cursor-pointer px-5 py-4"
              style={{ borderBottom: i < emails.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono truncate" style={{ color: "#38bdf8", maxWidth: 200 }}>
                      {msg.from}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{msg.subject || "(no subject)"}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#475569" }}>{msg.text?.slice(0, 80) || "—"}</p>
                </div>
                <div className="flex-shrink-0 text-xs whitespace-nowrap" style={{ color: "#334155" }}>
                  {formatTime(msg.receivedAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmailReader({
  email,
  onBack,
  formatTime,
}: {
  email: IncomingEmail;
  onBack: () => void;
  formatTime: (iso: string) => string;
}) {
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: "#64748b" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
      </div>

      {/* Email content */}
      <div className="px-5 py-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
          {email.subject || "(no subject)"}
        </h2>

        <div className="rounded-xl p-4 mb-4 text-xs space-y-1.5 font-mono" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex gap-3">
            <span style={{ color: "#475569", minWidth: 36 }}>From</span>
            <span style={{ color: "#94a3b8" }}>{email.from}</span>
          </div>
          <div className="flex gap-3">
            <span style={{ color: "#475569", minWidth: 36 }}>To</span>
            <span style={{ color: "#38bdf8" }}>{email.to}</span>
          </div>
          <div className="flex gap-3">
            <span style={{ color: "#475569", minWidth: 36 }}>Date</span>
            <span style={{ color: "#94a3b8" }}>{formatTime(email.receivedAt)} · {new Date(email.receivedAt).toLocaleString()}</span>
          </div>
        </div>

        {email.html && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowHtml(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: !showHtml ? "rgba(56,189,248,0.12)" : "transparent",
                border: `1px solid ${!showHtml ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: !showHtml ? "#38bdf8" : "#64748b",
              }}
            >
              Plain text
            </button>
            <button
              onClick={() => setShowHtml(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: showHtml ? "rgba(56,189,248,0.12)" : "transparent",
                border: `1px solid ${showHtml ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: showHtml ? "#38bdf8" : "#64748b",
              }}
            >
              HTML
            </button>
          </div>
        )}

        {showHtml && email.html ? (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <iframe
              srcDoc={email.html}
              sandbox="allow-same-origin"
              className="w-full"
              style={{ height: 400, background: "#fff" }}
              title="Email HTML preview"
            />
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#94a3b8" }}>
            {email.text || "(empty message)"}
          </div>
        )}
      </div>
    </div>
  );
}
