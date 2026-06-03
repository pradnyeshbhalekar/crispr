import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:5001";

// ── tiny helpers ──────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
function fmtSize(b) { return (b / 1024 / 1024).toFixed(2) + " MB"; }
function fmtSecs(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

// ── CSS injected once ─────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Mono',monospace;background:#fff;color:#374151;overflow-x:hidden;}

:root{
  --black:#374151;--white:#fff;--gray:#f7f7f7;--mid:#e2e2e2;
  --muted:#9ca3af;--red:#ff3333;--green:#00c060;
}

/* ── keyframes ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scrollLine{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(.88)}}
@keyframes waveBar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
@keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes runBar{0%{left:-45%;width:40%}60%{width:40%}100%{left:110%;width:10%}}
@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}

/* ── hero ── */
.hero{
  min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:2rem;position:relative;background:#fff;
}
.hero-eyebrow{
  font-size:.65rem;letter-spacing:.28em;text-transform:uppercase;
  color:var(--muted);margin-bottom:2rem;
  opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards .1s;
}
.hero-title{
  font-family:'DM Serif Display',serif;
  font-size:clamp(5rem,14vw,10.5rem);
  line-height:.88;text-align:center;letter-spacing:-.03em;
  opacity:0;animation:fadeUp .7s cubic-bezier(.22,1,.36,1) forwards .25s;
}
.hero-title em{font-style:italic;color:var(--muted);}
.hero-sub{
  margin-top:2.5rem;font-size:.8rem;color:var(--muted);
  letter-spacing:.04em;text-align:center;max-width:360px;line-height:1.9;
  opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards .45s;
}
.hero-btn{
  margin-top:3rem;
  opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards .6s;
}
.btn{
  display:inline-block;background:var(--black);color:#fff;
  border:none;padding:1rem 2.8rem;
  font-family:'DM Mono',monospace;font-size:.72rem;
  letter-spacing:.16em;text-transform:uppercase;
  cursor:pointer;transition:opacity .25s,transform .25s;
}
.btn:hover{opacity:.75;transform:translateY(-2px);}
.btn:active{transform:translateY(0);opacity:.9;}
.btn:disabled{background:var(--mid);color:var(--muted);cursor:not-allowed;transform:none;opacity:1;}
.btn-full{width:100%;}
.btn-outline{background:transparent;color:var(--black);border:1.5px solid var(--black);}
.btn-outline:hover{background:var(--black);color:#fff;}

.scroll-hint{
  position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;gap:.6rem;
  opacity:0;animation:fadeUp .6s cubic-bezier(.22,1,.36,1) forwards 1s;
}
.scroll-hint span{font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);}
.scroll-track{width:1px;height:44px;background:var(--mid);position:relative;overflow:hidden;}
.scroll-track::after{
  content:'';position:absolute;top:0;left:0;width:100%;height:45%;
  background:var(--black);animation:scrollLine 1.6s cubic-bezier(.4,0,.2,1) infinite;
}

/* ── noise texture overlay ── */
.noise{
  pointer-events:none;position:fixed;inset:0;z-index:999;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.03'/%3E%3C/svg%3E");
  opacity:.4;
}

/* ── app section ── */
.app{
  min-height:100vh;background:var(--gray);
  display:flex;flex-direction:column;align-items:center;
  padding:6rem 1.5rem 8rem;
}
.step-label{font-size:.62rem;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem;}
.section-title{
  font-family:'DM Serif Display',serif;
  font-size:clamp(1.8rem,4vw,2.6rem);
  letter-spacing:-.02em;text-align:center;margin-bottom:3rem;
}

/* ── card ── */
.card{
  width:100%;max-width:620px;background:#fff;
  border:1px solid var(--mid);padding:2.5rem;
  animation:slideIn .5s cubic-bezier(.22,1,.36,1);
  transition:box-shadow .3s;
}
.card:focus-within{box-shadow:0 4px 32px rgba(0,0,0,.07);}

/* ── tabs ── */
.tabs{display:flex;border-bottom:1px solid var(--mid);margin-bottom:2.5rem;}
.tab{
  flex:1;padding:.85rem;
  font-family:'DM Mono',monospace;font-size:.68rem;
  letter-spacing:.14em;text-transform:uppercase;
  cursor:pointer;border:none;background:none;
  color:var(--muted);border-bottom:2px solid transparent;
  margin-bottom:-1px;transition:color .2s,border-color .2s;
}
.tab:hover{color:var(--black);}
.tab.active{color:var(--black);border-bottom-color:var(--black);}

/* ── drop zone ── */
.drop{
  border:1.5px dashed var(--mid);padding:3rem 2rem;
  text-align:center;cursor:pointer;
  transition:border-color .25s,background .25s;
  position:relative;
}
.drop:hover,.drop.over{border-color:var(--black);background:var(--gray);}
.drop input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
.drop-icon{font-size:1.8rem;display:block;margin-bottom:1rem;color:var(--muted);transition:color .2s,transform .2s;}
.drop:hover .drop-icon{color:var(--black);transform:translateY(-2px);}
.drop-main{font-size:.82rem;font-weight:500;margin-bottom:.3rem;}
.drop-sub{font-size:.7rem;color:var(--muted);}

.file-pill{
  margin-top:1rem;padding:.7rem 1rem;
  background:var(--gray);font-size:.68rem;
  display:flex;align-items:center;justify-content:space-between;
  animation:slideIn .3s cubic-bezier(.22,1,.36,1);
}
.file-pill-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;}

/* ── recorder ── */
.rec-area{display:flex;flex-direction:column;align-items:center;gap:1.5rem;padding:1.5rem 0;}
.rec-btn{
  width:76px;height:76px;border-radius:50%;
  border:2px solid var(--mid);background:#fff;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:border-color .2s,box-shadow .2s,transform .2s;
}
.rec-btn:hover{border-color:var(--black);transform:scale(1.04);}
.rec-btn.on{border-color:var(--red);box-shadow:0 0 0 6px rgba(255,51,51,.1);}
.rec-dot{
  width:26px;height:26px;border-radius:50%;background:var(--red);
  transition:border-radius .3s,width .3s,height .3s;
}
.rec-btn.on .rec-dot{border-radius:4px;width:20px;height:20px;animation:pulse 1s ease infinite;}
.rec-timer{font-size:1.6rem;letter-spacing:.08em;font-variant-numeric:tabular-nums;}
.rec-status{font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);}

/* ── wave visualiser ── */
.wave{display:flex;align-items:center;gap:3px;height:28px;}
.wave-bar{
  width:3px;background:var(--black);border-radius:2px;
  animation:waveBar .8s ease infinite;
  transform-origin:bottom;
}

/* ── process area ── */
.process-area{margin-top:2rem;}
.processing{display:flex;flex-direction:column;gap:1rem;padding:1.5rem 0;animation:fadeIn .3s ease;}
.proc-label{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);text-align:center;}
.progress-track{height:2px;background:var(--mid);position:relative;overflow:hidden;border-radius:1px;}
.progress-run{
  position:absolute;top:0;left:0;height:100%;
  background:var(--black);animation:runBar 1.3s cubic-bezier(.4,0,.2,1) infinite;
}

/* ── result ── */
.result{
  width:100%;max-width:620px;margin-top:2rem;
  background:#fff;border:1px solid var(--mid);padding:2.5rem;
  animation:slideIn .5s cubic-bezier(.22,1,.36,1);
}
.result-head{
  display:flex;align-items:center;justify-content:space-between;
  padding-bottom:1.25rem;border-bottom:1px solid var(--mid);margin-bottom:2rem;
}
.result-head-title{font-family:'DM Serif Display',serif;font-size:1.4rem;}
.badge{
  font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;
  padding:.28rem .7rem;background:var(--black);color:#fff;
}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--mid);margin-bottom:2rem;}
.stat{background:#fff;padding:1.25rem 1rem;}
.stat-val{font-family:'DM Serif Display',serif;font-size:2.2rem;line-height:1;margin-bottom:.2rem;}
.stat-lbl{font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);}
.tags-title{font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.7rem;}
.tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:2rem;}
.tag{
  padding:.22rem .6rem;border:1px solid var(--mid);
  font-size:.65rem;color:var(--muted);
  transition:border-color .2s,color .2s;
}
.tag:hover{border-color:var(--black);color:var(--black);}
.audio-lbl{font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;}
audio{width:100%;margin-bottom:1.5rem;}
.dl-row{display:flex;gap:.75rem;}
`;

function injectStyles() {
  if (document.getElementById("crispr-styles")) return;
  const s = document.createElement("style");
  s.id = "crispr-styles";
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ── Wave component ─────────────────────────────────────────────────────────────
function Wave() {
  const bars = [1, 1.6, 0.7, 1.3, 0.5, 1.8, 1, 1.4, 0.8, 1.2];
  return (
    <div className="wave">
      {bars.map((delay, i) => (
        <div
          key={i}
          className="wave-bar"
          style={{
            height: `${8 + Math.random() * 14}px`,
            animationDelay: `${delay * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────
function Hero({ onStart }) {
  return (
    <section className="hero">
      <div className="noise" />
      <p className="hero-eyebrow">Audio Processing Tool</p>
      <h1 className="hero-title">
        <span style={{ color: "#323842" }}>Crisp</span><em>r.</em>
      </h1>
      <p className="hero-sub">
        Remove filler words from your recordings.<br />
        Sound like you meant every word.
      </p>
      <div className="hero-btn">
        <button className="btn" onClick={onStart}>
          Start Cleaning →
        </button>
      </div>
      <div className="scroll-hint">
        <span>Scroll</span>
        <div className="scroll-track" />
      </div>
    </section>
  );
}

// ── Upload Tab ─────────────────────────────────────────────────────────────────
function UploadTab({ onFile }) {
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);

  function pick(f) {
    if (!f || !f.type.startsWith("audio/")) return;
    setFile(f);
    onFile(f);
  }

  return (
    <div>
      <div
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept="audio/*" onChange={(e) => pick(e.target.files[0])} />
        <span className="drop-icon">◎</span>
        <p className="drop-main">Drop your audio file here</p>
        <p className="drop-sub">or click to browse — mp3, wav, m4a</p>
      </div>
      {file && (
        <div className="file-pill">
          <span className="file-pill-name">{file.name}</span>
          <span style={{ color: "var(--muted)" }}>{fmtSize(file.size)}</span>
        </div>
      )}
    </div>
  );
}

// ── Record Tab ─────────────────────────────────────────────────────────────────
function RecordTab({ onBlob }) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  async function toggle() {
    if (recording) {
      mrRef.current?.stop();
      clearInterval(timerRef.current);
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mrRef.current = mr;
        mr.ondataavailable = (e) => chunksRef.current.push(e.data);
        mr.onstop = () => {
          const b = new Blob(chunksRef.current, { type: "audio/webm" });
          setBlob(b);
          onBlob(b);
          if (audioRef.current) audioRef.current.src = URL.createObjectURL(b);
          stream.getTracks().forEach((t) => t.stop());
        };
        mr.start();
        setSecs(0);
        setRecording(true);
        timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
      } catch {
        alert("Microphone access denied.");
      }
    }
  }

  return (
    <div className="rec-area">
      <button className={`rec-btn${recording ? " on" : ""}`} onClick={toggle}>
        <div className="rec-dot" />
      </button>
      {recording && <Wave />}
      <div className="rec-timer">{fmtSecs(secs)}</div>
      <div className="rec-status">
        {recording ? "Recording — tap to stop" : blob ? "Recording saved" : "Press to record"}
      </div>
      {blob && (
        <div style={{ width: "100%", animation: "slideIn .3s cubic-bezier(.22,1,.36,1)" }}>
          <div className="audio-lbl">Preview Recording</div>
          <audio ref={audioRef} controls />
        </div>
      )}
    </div>
  );
}

// ── Processing indicator ───────────────────────────────────────────────────────
const STEPS = ["Transcribing audio...", "Detecting filler words...", "Splicing clean audio..."];

function Processing() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % STEPS.length);
        setVisible(true);
      }, 200);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="processing">
      <div
        className="proc-label"
        style={{ transition: "opacity .2s", opacity: visible ? 1 : 0 }}
      >
        {STEPS[idx]}
      </div>
      <div className="progress-track">
        <div className="progress-run" />
      </div>
    </div>
  );
}

// ── Result ─────────────────────────────────────────────────────────────────────
function Result({ data, elapsed, audioUrl, jobId }) {
  function download() {
    const a = document.createElement("a");
    a.href = `${API_BASE}/download/${jobId}`;
    a.download = "clean.mp3";
    a.click();
  }

  return (
    <div className="result">
      <div className="result-head">
        <div className="result-head-title">Clean Audio Ready</div>
        <div className="badge">Done</div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-val">{data.fillers_removed}</div>
          <div className="stat-lbl">Fillers Removed</div>
        </div>
        <div className="stat">
          <div className="stat-val">{elapsed}s</div>
          <div className="stat-lbl">Processing Time</div>
        </div>
      </div>

      {data.fillers?.length > 0 && (
        <>
          <div className="tags-title">Words Removed</div>
          <div className="tags">
            {data.fillers.map((f, i) => (
              <span key={i} className="tag">
                {f.word}{" "}
                <span style={{ fontSize: ".58rem", opacity: .6 }}>{f.start.toFixed(1)}s</span>
              </span>
            ))}
          </div>
        </>
      )}

      <div className="audio-lbl">Preview Clean Audio</div>
      <audio src={audioUrl} controls />

      <div className="dl-row">
        <button className="btn btn-full" onClick={download}>
          Download Clean Audio →
        </button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => { injectStyles(); }, []);

  const appRef = useRef(null);
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [blob, setBlob] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const canProcess = file || blob;

  function switchTab(t) {
    setTab(t);
    setFile(null);
    setBlob(null);
  }

  async function process() {
    const f = file || (blob ? new File([blob], "recording.webm", { type: "audio/webm" }) : null);
    if (!f) return;

    setStatus("processing");
    setResult(null);
    const t0 = Date.now();

    try {
      const fd = new FormData();
      fd.append("audio", f);
      const res = await fetch(`${API_BASE}/process`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const secs = ((Date.now() - t0) / 1000).toFixed(1);

      const audioRes = await fetch(`${API_BASE}/download/${data.job_id}`);
      const audioBlob = await audioRes.blob();
      const url = URL.createObjectURL(audioBlob);

      setJobId(data.job_id);
      setResult(data);
      setElapsed(secs);
      setAudioUrl(url);
      setStatus("done");

      setTimeout(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  return (
    <>
      <Hero onStart={() => appRef.current?.scrollIntoView({ behavior: "smooth" })} />

      <section className="app" ref={appRef}>
        <p className="step-label">Step 01</p>
        <h2 className="section-title" style={{ color: "#323842" }}>Upload or Record</h2>

        <div className="card">
          <div className="tabs">
            {["upload", "record"].map((t) => (
              <button
                key={t}
                className={`tab${tab === t ? " active" : ""}`}
                onClick={() => switchTab(t)}
              >
                {t === "upload" ? "Upload File" : "Record Audio"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <UploadTab onFile={setFile} />
          ) : (
            <RecordTab onBlob={setBlob} />
          )}

          <div className="process-area">
            {status === "processing" ? (
              <Processing />
            ) : (
              <button
                className="btn btn-full"
                disabled={!canProcess}
                onClick={process}
              >
                Remove Filler Words →
              </button>
            )}
            {status === "error" && (
              <p style={{ marginTop: "1rem", fontSize: ".7rem", color: "var(--red)", textAlign: "center" }}>
                Error: {errMsg}
              </p>
            )}
          </div>
        </div>

        <div id="result-anchor" />
        {status === "done" && result && (
          <Result data={result} elapsed={elapsed} audioUrl={audioUrl} jobId={jobId} />
        )}
      </section>
    </>
  );
}
