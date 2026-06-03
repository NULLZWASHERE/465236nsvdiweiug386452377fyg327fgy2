"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  receivedAt: string;
}

const POLL_MS = 8000;

export default function Page() {
  const [address, setAddress]     = useState("");
  const [emails, setEmails]       = useState<Email[]>([]);
  const [loading, setLoading]     = useState(false);
  const [genning, setGenning]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [selected, setSelected]   = useState<Email | null>(null);
  const [htmlTab, setHtmlTab]     = useState(false);
  const [checkedAt, setCheckedAt] = useState("");
  const [noStorage, setNoStorage] = useState(false);
  const addrRef  = useRef("");
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInbox = useCallback(async (addr: string) => {
    if (!addr) return;
    try {
      const r = await fetch(`/api/inbox/${encodeURIComponent(addr)}`);
      const d = await r.json();
      if (r.status === 503) { setNoStorage(true); return; }
      setNoStorage(false);
      setEmails(d.emails ?? []);
      setCheckedAt(new Date().toLocaleTimeString());
    } catch { /* ignore */ }
  }, []);

  const startPoll = useCallback((addr: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchInbox(addr), POLL_MS);
  }, [fetchInbox]);

  const generate = useCallback(async () => {
    setGenning(true);
    setEmails([]);
    setSelected(null);
    setNoStorage(false);
    try {
      const r = await fetch("/api/generate");
      const d = await r.json();
      setAddress(d.email);
      addrRef.current = d.email;
      startPoll(d.email);
      await fetchInbox(d.email);
    } finally { setGenning(false); }
  }, [fetchInbox, startPoll]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchInbox(addrRef.current);
    setLoading(false);
  }, [fetchInbox]);

  const clearInbox = async () => {
    await fetch(`/api/delete/${encodeURIComponent(address)}`, { method: "DELETE" });
    setEmails([]);
    setSelected(null);
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => { generate(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const ago = (iso: string) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60)    return "just now";
    if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "44px 16px 60px" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <span style={{
            fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg,#38bdf8,#a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>zekoro.fun</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Instant disposable email. No signup. No tracking.</p>
      </header>

      {/* ── Address card ────────────────────────────────────────── */}
      <Card style={{ marginBottom: 10 }}>
        <Label>Your address</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            flex: 1, padding: "11px 14px", borderRadius: 10,
            background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.22)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "var(--text)",
            overflowX: "auto", whiteSpace: "nowrap", minHeight: 44, display: "flex", alignItems: "center",
          }}>
            {genning
              ? <span className="shimmer-line" style={{ width: 210, height: 14 }} />
              : address || "—"}
          </div>
          <Btn
            onClick={copy}
            disabled={!address || genning}
            style={copied
              ? { background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", color: "#38bdf8" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
          >
            {copied
              ? <><IconCheck /> Copied</>
              : <><IconCopy /> Copy</>}
          </Btn>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={generate} disabled={genning} style={{
            background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)", color: "#fff", fontWeight: 600,
          }}>
            <IconRefresh spin={genning} /> {genning ? "Generating…" : "New address"}
          </Btn>
          <Btn onClick={refresh} disabled={loading || !address} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
          }}>
            <IconRefresh spin={loading} /> Refresh
          </Btn>
          {emails.length > 0 && (
            <Btn onClick={clearInbox} style={{
              marginLeft: "auto",
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171",
            }}>
              <IconTrash /> Clear
            </Btn>
          )}
        </div>

        {checkedAt && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#334155" }}>
            Last checked: {checkedAt} · Auto-refreshes every {POLL_MS / 1000}s
          </p>
        )}
      </Card>

      {/* ── Inbox / Reader ──────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden", minHeight: 320 }}>
        {selected ? (
          /* ── Email reader ── */
          <div className="animate-fade-in" style={{ padding: 20 }}>
            <button onClick={() => { setSelected(null); setHtmlTab(false); }} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 13, color: "var(--muted)", background: "none", border: "none",
              cursor: "pointer", marginBottom: 16, padding: 0,
            }}>
              <IconBack /> Back
            </button>

            <h2 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 16, color: "var(--text)" }}>
              {selected.subject || "(no subject)"}
            </h2>

            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 14,
              fontFamily: "monospace", fontSize: 12,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              {[["From", selected.from, "#94a3b8"], ["To", selected.to, "#38bdf8"], ["Date", new Date(selected.receivedAt).toLocaleString(), "#94a3b8"]].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", gap: 14 }}>
                  <span style={{ color: "#475569", minWidth: 36 }}>{k}</span>
                  <span style={{ color: c }}>{v}</span>
                </div>
              ))}
            </div>

            {selected.html && (
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["Plain text", false], ["HTML", true]].map(([label, isHtml]) => (
                  <button key={String(label)} onClick={() => setHtmlTab(isHtml as boolean)} style={{
                    padding: "5px 13px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: htmlTab === isHtml ? "rgba(56,189,248,0.12)" : "transparent",
                    border: `1px solid ${htmlTab === isHtml ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.07)"}`,
                    color: htmlTab === isHtml ? "#38bdf8" : "#64748b",
                    transition: ".15s",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {htmlTab && selected.html
              ? <iframe srcDoc={selected.html} sandbox="allow-same-origin" title="Email HTML"
                  style={{ width: "100%", height: 380, border: "1px solid var(--border)", borderRadius: 10, background: "#fff" }} />
              : <pre style={{ fontSize: 13, lineHeight: 1.75, color: "#94a3b8", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit" }}>
                  {selected.text || "(empty)"}
                </pre>
            }
          </div>
        ) : (
          /* ── Inbox list ── */
          <>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>Inbox</span>
                {emails.length > 0 && (
                  <span style={{
                    background: "rgba(56,189,248,0.15)", color: "#38bdf8",
                    borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                  }}>{emails.length}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
                Live
              </div>
            </div>

            {noStorage ? (
              <EmptyState
                icon={<IconWarn />}
                color="#fbbf24"
                title="Storage not configured"
                sub={<>Add <code style={{ background:"rgba(255,255,255,0.06)", padding:"1px 5px", borderRadius:4 }}>UPSTASH_REDIS_REST_URL</code> and <code style={{ background:"rgba(255,255,255,0.06)", padding:"1px 5px", borderRadius:4 }}>UPSTASH_REDIS_REST_TOKEN</code> to your Vercel environment variables.</>}
              />
            ) : emails.length === 0 ? (
              <EmptyState
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                title="No emails yet"
                sub="Copy your address above and use it anywhere. Messages appear here automatically."
              />
            ) : (
              <ul style={{ listStyle: "none" }}>
                {emails.map((msg, i) => (
                  <li key={msg.id} onClick={() => { setSelected(msg); setHtmlTab(false); }} style={{
                    padding: "14px 18px", cursor: "pointer", transition: "background .12s",
                    borderBottom: i < emails.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#38bdf8", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {msg.from}
                      </span>
                      <span style={{ fontSize: 11, color: "#334155", whiteSpace: "nowrap", flexShrink: 0 }}>{ago(msg.receivedAt)}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0", margin: "4px 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.subject || "(no subject)"}
                    </p>
                    <p style={{ fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {msg.text?.slice(0, 90) || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <footer style={{ marginTop: 36, textAlign: "center", fontSize: 12, color: "#1e293b" }}>
        Emails auto-delete after 24h · zekoro.fun
      </footer>
    </main>
  );
}

/* ── Small helpers ──────────────────────────────────────────────────── */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
      padding: 22, ...style,
    }}>{children}</div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>{children}</p>;
}

function Btn({ children, onClick, disabled, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
      cursor: disabled ? "not-allowed" : "pointer", border: "none",
      opacity: disabled ? 0.5 : 1, transition: "opacity .15s, transform .12s",
      ...style,
    }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, color = "#38bdf8", title, sub }: {
  icon: React.ReactNode; color?: string; title: string; sub: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", textAlign: "center", gap: 12 }}>
      <div style={{
        width: 50, height: 50, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${color}12`, border: `1px dashed ${color}44`,
      }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>{title}</p>
      <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{sub}</p>
    </div>
  );
}

function IconRefresh({ spin }: { spin?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={spin ? { animation: "spin .9s linear infinite" } : undefined}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  );
}
function IconCopy() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function IconCheck() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
}
function IconBack() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function IconWarn() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
