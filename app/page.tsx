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
const DOMAIN = "@zekoro.fun";

export default function Page() {
  const [address, setAddress]       = useState("");
  const [emails, setEmails]         = useState<Email[]>([]);
  const [loading, setLoading]       = useState(false);
  const [genning, setGenning]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const [selected, setSelected]     = useState<Email | null>(null);
  const [htmlTab, setHtmlTab]       = useState(false);
  const [checkedAt, setCheckedAt]   = useState("");
  const [noStorage, setNoStorage]   = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customErr, setCustomErr]   = useState("");
  const [compose, setCompose]       = useState(false);
  const [sendTo, setSendTo]         = useState("");
  const [sendSubj, setSendSubj]     = useState("");
  const [sendBody, setSendBody]     = useState("");
  const [sending, setSending]       = useState(false);
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const addrRef = useRef("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const activateAddress = useCallback((addr: string) => {
    setAddress(addr);
    addrRef.current = addr;
    setEmails([]);
    setSelected(null);
    setNoStorage(false);
    startPoll(addr);
    fetchInbox(addr);
  }, [fetchInbox, startPoll]);

  const generate = useCallback(async () => {
    setGenning(true);
    try {
      const r = await fetch("/api/generate");
      const d = await r.json();
      activateAddress(d.email);
    } finally { setGenning(false); }
  }, [activateAddress]);

  const useCustom = () => {
    const raw = customInput.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!raw) { setCustomErr("Enter a username"); return; }
    if (raw.length < 3) { setCustomErr("At least 3 characters"); return; }
    setCustomErr("");
    setCustomInput("");
    activateAddress(`${raw}${DOMAIN}`);
  };

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

  const sendEmail = async () => {
    if (!sendTo || !sendSubj || !sendBody) return;
    setSending(true);
    setSendStatus(null);
    try {
      const r = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: address, to: sendTo, subject: sendSubj, text: sendBody }),
      });
      const d = await r.json();
      if (r.ok) {
        setSendStatus({ ok: true, msg: "Sent!" });
        setSendTo(""); setSendSubj(""); setSendBody("");
        setTimeout(() => { setCompose(false); setSendStatus(null); }, 1500);
      } else {
        setSendStatus({ ok: false, msg: d.error ?? "Failed to send" });
      }
    } catch {
      setSendStatus({ ok: false, msg: "Network error" });
    } finally { setSending(false); }
  };

  useEffect(() => {
    generate();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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
            {copied ? <><IconCheck /> Copied</> : <><IconCopy /> Copy</>}
          </Btn>
        </div>

        {/* Custom address picker */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              border: `1px solid ${customErr ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10, overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
            }}>
              <input
                value={customInput}
                onChange={e => { setCustomInput(e.target.value); setCustomErr(""); }}
                onKeyDown={e => { if (e.key === "Enter") useCustom(); }}
                placeholder="pick your own username"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  padding: "9px 12px", fontSize: 13, color: "var(--text)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <span style={{ padding: "0 12px 0 0", fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>
                {DOMAIN}
              </span>
            </div>
            <Btn onClick={useCustom} style={{
              background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
              color: "#a78bfa", flexShrink: 0,
            }}>Use</Btn>
          </div>
          {customErr && <p style={{ fontSize: 12, color: "#f87171", marginTop: 5 }}>{customErr}</p>}
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
          <Btn onClick={() => { setCompose(true); setSendStatus(null); }} disabled={!address} style={{
            background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8",
          }}>
            <IconCompose /> Compose
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

      {/* ── Compose modal ───────────────────────────────────────── */}
      {compose && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setCompose(false); }}>
          <div className="animate-fade-in" style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 18, padding: 24, width: "100%", maxWidth: 480,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Compose email</span>
              <button onClick={() => setCompose(false)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18, lineHeight: 1,
              }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ComposeField label="From" value={address} readOnly />
              <ComposeField label="To" value={sendTo} onChange={setSendTo} placeholder="recipient@example.com" type="email" />
              <ComposeField label="Subject" value={sendSubj} onChange={setSendSubj} placeholder="Subject" />
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 6 }}>Message</label>
                <textarea
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={6}
                  style={{
                    width: "100%", resize: "vertical",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "var(--text)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {sendStatus && (
              <div style={{
                marginTop: 12, padding: "9px 12px", borderRadius: 8, fontSize: 13,
                background: sendStatus.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${sendStatus.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: sendStatus.ok ? "#4ade80" : "#f87171",
              }}>{sendStatus.msg}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <Btn onClick={() => setCompose(false)} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
              }}>Cancel</Btn>
              <Btn onClick={sendEmail} disabled={sending || !sendTo || !sendSubj || !sendBody} style={{
                background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)", color: "#fff", fontWeight: 600,
              }}>
                {sending ? <><IconRefresh spin /> Sending…</> : <><IconSend /> Send</>}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Inbox / Reader ──────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden", minHeight: 320 }}>
        {selected ? (
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

            {/* Reply button */}
            <div style={{ marginBottom: 14 }}>
              <Btn onClick={() => {
                setSendTo(selected.from);
                setSendSubj(`Re: ${selected.subject}`);
                setSendBody(`\n\n--- Original message ---\n${selected.text}`);
                setSendStatus(null);
                setCompose(true);
              }} style={{
                background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8",
              }}>
                <IconReply /> Reply
              </Btn>
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
                sub={<>Connect an Upstash Redis database in your Vercel project → Storage tab.</>}
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

/* ── Compose field helper ───────────────────────────────────────────── */
function ComposeField({ label, value, onChange, placeholder, readOnly, type }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean; type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 5 }}>{label}</label>
      <input
        type={type ?? "text"}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          width: "100%",
          background: readOnly ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "9px 12px", fontSize: 13,
          color: readOnly ? "#64748b" : "var(--text)",
          outline: "none", fontFamily: readOnly ? "'JetBrains Mono', monospace" : "inherit",
          cursor: readOnly ? "default" : "text",
        }}
      />
    </div>
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
function IconCompose() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
}
function IconSend() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IconReply() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>;
}
