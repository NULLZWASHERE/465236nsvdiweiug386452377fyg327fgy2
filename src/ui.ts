export function renderHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>zekoro.fun — Free Disposable Email</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0e1a;--surface:#111827;--border:rgba(255,255,255,0.06);
  --text:#f1f5f9;--muted:#64748b;--brand:#38bdf8;--accent:#a78bfa;
}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
main{max-width:640px;margin:0 auto;padding:40px 16px}
/* header */
.header{text-align:center;margin-bottom:40px}
.logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:10px}
.logo-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);display:flex;align-items:center;justify-content:center}
.logo-text{font-size:22px;font-weight:700;background:linear-gradient(135deg,#38bdf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.tagline{color:var(--muted);font-size:14px}
/* card */
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:12px}
.label{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px}
.email-row{display:flex;gap:10px;align-items:center}
.email-box{flex:1;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);border-radius:12px;padding:12px 16px;font-family:'JetBrains Mono',monospace,monospace;font-size:14px;color:var(--text);overflow-x:auto;white-space:nowrap;min-height:46px;display:flex;align-items:center}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:.15s}
.btn-copy{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#94a3b8}
.btn-copy:hover{background:rgba(255,255,255,.08)}
.btn-copy.copied{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.3);color:#38bdf8}
.actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.btn-new{background:linear-gradient(135deg,#0ea5e9,#8b5cf6);color:#fff;font-weight:600}
.btn-new:hover{opacity:.9}
.btn-refresh{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#94a3b8}
.btn-refresh:hover{background:rgba(255,255,255,.07)}
.btn-clear{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.15);color:#f87171;margin-left:auto}
.btn-clear:hover{background:rgba(239,68,68,.12)}
.checked{margin-top:10px;font-size:12px;color:#334155}
/* inbox */
.inbox-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
.inbox-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#94a3b8}
.badge{background:rgba(56,189,248,.15);color:#38bdf8;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700}
.pulse{width:8px;height:8px;border-radius:50%;background:#38bdf8;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
/* empty */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center;gap:12px}
.empty-icon{width:52px;height:52px;border-radius:16px;background:rgba(56,189,248,.06);border:1px dashed rgba(56,189,248,.2);display:flex;align-items:center;justify-content:center;opacity:.6}
.empty-title{font-size:14px;color:#475569}
.empty-sub{font-size:13px;color:#334155;line-height:1.6}
/* rows */
.email-item{padding:16px 20px;cursor:pointer;transition:background .12s;border-bottom:1px solid rgba(255,255,255,.03)}
.email-item:last-child{border-bottom:none}
.email-item:hover{background:rgba(255,255,255,.03)}
.item-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.item-from{font-size:12px;font-family:monospace;color:#38bdf8;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item-time{font-size:11px;color:#334155;white-space:nowrap;flex-shrink:0}
.item-subject{font-size:14px;font-weight:500;color:#e2e8f0;margin:.4em 0 .25em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item-preview{font-size:12px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* reader */
.reader{display:none;padding:20px}
.reader.active{display:block}
.back-btn{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer;border:none;background:none;margin-bottom:16px;padding:0}
.back-btn:hover{color:#94a3b8}
.reader-subject{font-size:18px;font-weight:600;color:var(--text);margin-bottom:16px;line-height:1.4}
.reader-meta{background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:10px;padding:14px 16px;font-size:12px;font-family:monospace;margin-bottom:16px;display:flex;flex-direction:column;gap:6px}
.meta-row{display:flex;gap:16px}
.meta-key{color:#475569;min-width:36px}
.meta-val{color:#94a3b8}
.meta-val.to{color:#38bdf8}
.tab-row{display:flex;gap:6px;margin-bottom:14px}
.tab{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(255,255,255,.06);background:transparent;color:#64748b;transition:.15s}
.tab.active{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.3);color:#38bdf8}
.body-text{font-size:14px;line-height:1.7;color:#94a3b8;white-space:pre-wrap;word-break:break-word}
.body-frame{width:100%;height:380px;border:1px solid var(--border);border-radius:10px;background:#fff}
/* footer */
footer{text-align:center;margin-top:36px;font-size:12px;color:#1e293b}
/* shimmer */
.shimmer{display:inline-block;width:200px;height:14px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes spin{to{transform:rotate(360deg)}}
.spinning{animation:spin .9s linear infinite}
</style>
</head>
<body>
<main>
  <header class="header">
    <div class="logo">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      </div>
      <span class="logo-text">zekoro.fun</span>
    </div>
    <p class="tagline">Instant disposable email. No signup. No tracking.</p>
  </header>

  <!-- Address card -->
  <div class="card">
    <p class="label">Your address</p>
    <div class="email-row">
      <div class="email-box" id="emailBox"><span class="shimmer"></span></div>
      <button class="btn btn-copy" id="copyBtn" onclick="copyEmail()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
    </div>
    <div class="actions">
      <button class="btn btn-new" onclick="newAddress()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
        New address
      </button>
      <button class="btn btn-refresh" id="refreshBtn" onclick="refreshInbox()">
        <svg id="refreshIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        Refresh
      </button>
      <button class="btn btn-clear" id="clearBtn" style="display:none" onclick="clearInbox()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6 18.1 20a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6"/></svg>
        Clear
      </button>
    </div>
    <div class="checked" id="checkedAt"></div>
  </div>

  <!-- Inbox card -->
  <div class="card" style="padding:0;overflow:hidden">
    <!-- Inbox list view -->
    <div id="inboxView">
      <div class="inbox-header">
        <div class="inbox-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          Inbox
          <span class="badge" id="countBadge" style="display:none">0</span>
        </div>
        <div id="pollingDot" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#475569">
          <div class="pulse"></div> Live
        </div>
      </div>
      <div id="inboxBody"></div>
    </div>

    <!-- Email reader view -->
    <div id="readerView" style="display:none;padding:20px">
      <button class="back-btn" onclick="closeReader()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="reader-subject" id="readerSubject"></div>
      <div class="reader-meta" id="readerMeta"></div>
      <div class="tab-row" id="tabRow" style="display:none">
        <button class="tab active" onclick="switchTab('text')">Plain text</button>
        <button class="tab" onclick="switchTab('html')">HTML</button>
      </div>
      <div class="body-text" id="bodyText"></div>
      <iframe class="body-frame" id="bodyFrame" style="display:none" sandbox="allow-same-origin" title="Email HTML"></iframe>
    </div>
  </div>

  <footer>
    Emails auto-delete after 24h &middot; zekoro.fun &middot;
    <a href="https://github.com/NULLZWASHERE/zekoro.fun" style="color:#1e293b">GitHub</a>
  </footer>
</main>

<script>
let currentEmail = '';
let emails = [];
let pollTimer = null;
const POLL_MS = 8000;

const adjs = ['swift','bold','calm','dark','epic','fast','gold','icy','jade','keen','lazy','mild','neat','odd','pale','quick','rare','slim','tall','vast','warm','zany','azure','brisk','crisp','neon','lunar','misty','pixel','rusty','silver','teal','ultra','vivid','wild','xenon','zinc','amber','blaze','cobalt','drift','ember','flint','ghost','iron','jolly','fierce'];
const nouns = ['fox','wolf','hawk','bear','deer','lynx','crow','fern','moss','rock','star','moon','wave','dust','mist','leaf','pine','oak','ash','ivy','sage','dawn','void','pixel','byte','node','core','flux','prism','cipher','ghost','ridge','storm','blade','crest','forge','isle','lark','maze','orbit','pulse','quest','realm','shade','tide','veil','wisp','zone','echo','frost'];
const alpha = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randStr(n){ return Array.from({length:n},()=>alpha[Math.floor(Math.random()*alpha.length)]).join(''); }

function generateAddress(){
  return randChoice(adjs)+'.'+randChoice(nouns)+'.'+randStr(4)+'@zekoro.fun';
}

function fmtTime(iso){
  const d=new Date(iso), now=Date.now(), diff=now-d;
  if(diff<60000) return 'just now';
  if(diff<3600000) return Math.floor(diff/60000)+'m ago';
  if(diff<86400000) return Math.floor(diff/3600000)+'h ago';
  return d.toLocaleDateString();
}

async function fetchInbox(){
  if(!currentEmail) return;
  try{
    const r = await fetch('/api/inbox/'+encodeURIComponent(currentEmail));
    const d = await r.json();
    emails = d.emails || [];
    renderInbox();
    document.getElementById('checkedAt').textContent =
      'Last checked: '+new Date().toLocaleTimeString()+' · Auto-refreshes every '+(POLL_MS/1000)+'s';
  } catch(e){}
}

function renderInbox(){
  const body = document.getElementById('inboxBody');
  const badge = document.getElementById('countBadge');
  const clearBtn = document.getElementById('clearBtn');
  if(emails.length===0){
    badge.style.display='none';
    clearBtn.style.display='none';
    body.innerHTML = \`<div class="empty">
      <div class="empty-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      </div>
      <p class="empty-title">No emails yet</p>
      <p class="empty-sub">Copy your address above and use it anywhere.<br>Messages appear here automatically.</p>
    </div>\`;
    return;
  }
  badge.textContent = emails.length;
  badge.style.display = '';
  clearBtn.style.display = '';
  body.innerHTML = emails.map((m,i)=>\`
    <div class="email-item" onclick="openEmail(\${i})">
      <div class="item-top">
        <span class="item-from">\${esc(m.from)}</span>
        <span class="item-time">\${fmtTime(m.receivedAt)}</span>
      </div>
      <div class="item-subject">\${esc(m.subject||'(no subject)')}</div>
      <div class="item-preview">\${esc((m.text||'').slice(0,90))}</div>
    </div>
  \`).join('');
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function openEmail(i){
  const m = emails[i];
  document.getElementById('readerSubject').textContent = m.subject||'(no subject)';
  document.getElementById('readerMeta').innerHTML = \`
    <div class="meta-row"><span class="meta-key">From</span><span class="meta-val">\${esc(m.from)}</span></div>
    <div class="meta-row"><span class="meta-key">To</span><span class="meta-val to">\${esc(m.to)}</span></div>
    <div class="meta-row"><span class="meta-key">Date</span><span class="meta-val">\${new Date(m.receivedAt).toLocaleString()}</span></div>
  \`;
  const tabRow = document.getElementById('tabRow');
  if(m.html){ tabRow.style.display='flex'; } else { tabRow.style.display='none'; }
  switchTab('text', m);
  window._currentMsg = m;
  document.getElementById('inboxView').style.display='none';
  document.getElementById('readerView').style.display='block';
}

function switchTab(t, msg){
  const m = msg || window._currentMsg;
  if(!m) return;
  const txt = document.getElementById('bodyText');
  const frm = document.getElementById('bodyFrame');
  document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active', (t==='text'&&i===0)||(t==='html'&&i===1)));
  if(t==='html'&&m.html){
    txt.style.display='none'; frm.style.display='block';
    frm.srcdoc = m.html;
  } else {
    txt.style.display='block'; frm.style.display='none';
    txt.textContent = m.text||'(empty)';
  }
}

function closeReader(){
  document.getElementById('readerView').style.display='none';
  document.getElementById('inboxView').style.display='block';
}

async function newAddress(){
  clearPoll();
  emails=[];
  currentEmail = generateAddress();
  document.getElementById('emailBox').textContent = currentEmail;
  renderInbox();
  startPoll();
  await fetchInbox();
}

async function refreshInbox(){
  const icon = document.getElementById('refreshIcon');
  icon.classList.add('spinning');
  await fetchInbox();
  icon.classList.remove('spinning');
}

async function clearInbox(){
  await fetch('/api/delete/'+encodeURIComponent(currentEmail),{method:'DELETE'});
  emails=[];
  renderInbox();
}

function copyEmail(){
  if(!currentEmail) return;
  navigator.clipboard.writeText(currentEmail).then(()=>{
    const btn = document.getElementById('copyBtn');
    btn.classList.add('copied');
    btn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied\`;
    setTimeout(()=>{
      btn.classList.remove('copied');
      btn.innerHTML = \`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy\`;
    },2000);
  });
}

function startPoll(){ pollTimer=setInterval(fetchInbox,POLL_MS); }
function clearPoll(){ if(pollTimer){clearInterval(pollTimer);pollTimer=null;} }

// Boot
newAddress();
</script>
</body>
</html>`;
}
