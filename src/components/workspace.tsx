"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FlaskConical,
  Layers,
  Plus,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Brand, Face } from "./brand";
import { PUBLIC_PROVIDER_ACCESS } from "@/lib/public-demo";
import {
  metrics,
  ScanSchema,
  type Workspace,
  type SkinScan,
  type Routine,
} from "@/lib/models";
import { empty, load, save, removeAll, parseImport } from "@/lib/storage";
import { sample } from "@/lib/fixtures";
import { compare } from "@/lib/skin/compare";
import { decide } from "@/lib/skin/insights";
import { prepare } from "@/lib/skin/photo-quality";
const date = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const labels: Record<string, string> = {
  moisture: "Moisture",
  texture: "Texture",
  pore: "Pores",
  redness: "Redness",
  oiliness: "Oiliness",
  radiance: "Radiance",
  acne: "Acne",
};
const tabs = [
  { id: "atlas", name: "Skin Atlas", icon: Layers },
  { id: "timeline", name: "Signal vs. Noise", icon: Activity },
  { id: "routine", name: "Routine Lab", icon: FlaskConical },
  { id: "decision", name: "Decision Studio", icon: Sparkles },
];
function Chart({ scans, metric }: { scans: SkinScan[]; metric: string }) {
  const xAt = (i: number) =>
    scans.length < 2 ? 330 : 60 + (i * 525) / (scans.length - 1);
  const vals = scans.map(
    (s) =>
      s.scores.find((v) => v.metricKey === metric && v.region === "whole")
        ?.rawScore ?? null,
  );
  return (
    <>
      <svg
        className="chart"
        viewBox="0 0 640 220"
        role="img"
        aria-label={`${labels[metric]} raw scores over time; 0 to 100 scale`}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#8db5a1" stopOpacity=".4" />
            <stop offset="1" stopColor="#8db5a1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1="35"
              x2="625"
              y1={185 - v * 1.5}
              y2={185 - v * 1.5}
              stroke="#dce3d9"
              strokeDasharray="3 5"
            />
            <text x="0" y={189 - v * 1.5} fontSize="11" fill="#66756b">
              {v}
            </text>
          </g>
        ))}
        {vals.map((v, i) =>
          v !== null ? (
            <g key={i}>
              {i > 0 &&
                vals[i - 1] !== null &&
                compare(scans[i - 1], scans[i], metric).comparable && (
                  <line
                    x1={xAt(i - 1)}
                    x2={xAt(i)}
                    y1={185 - vals[i - 1]! * 1.5}
                    y2={185 - v * 1.5}
                    stroke="#275e57"
                    strokeWidth="2"
                  />
                )}
              <circle
                cx={xAt(i)}
                cy={185 - v * 1.5}
                r="6"
                fill="#f7f5f0"
                stroke="#275e57"
                strokeWidth="2"
              >
                <title>
                  {date(scans[i].capturedAt)}: {v} raw · {scans[i].source}
                </title>
              </circle>
              <text
                x={xAt(i)}
                y="213"
                textAnchor="middle"
                fontSize="11"
                fill="#66756b"
              >
                {date(scans[i].capturedAt)}
              </text>
            </g>
          ) : null,
        )}
      </svg>
      <details>
        <summary>View accessible data table</summary>
        <table>
          <caption>{labels[metric]} · provider raw score · 0–100</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Raw</th>
              <th>UI adjusted</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => {
              const score = s.scores.find(
                (v) => v.metricKey === metric && v.region === "whole",
              );
              return (
                <tr key={s.id}>
                  <td>{date(s.capturedAt)}</td>
                  <td>{score?.rawScore ?? "Missing"}</td>
                  <td>{score?.uiScore ?? "Missing"}</td>
                  <td>{s.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </>
  );
}
export default function WorkspaceApp({
  section: initialSection,
}: {
  section: string;
}) {
  const pathname = usePathname();
  const section =
    pathname === "/app" ? "atlas" : pathname?.split("/")[2] || initialSection;
  const [w, setW] = useState<Workspace>(empty("live"));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [metric, setMetric] = useState("moisture");
  const [selected, setSelected] = useState(-1);
  const [first, setFirst] = useState(0);
  const [last, setLast] = useState(-1);
  const [reduced, setReduced] = useState(false);
  const [contrast, setContrast] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ns =
          new URLSearchParams(location.search).get("sample") === "1"
            ? "demo_fixture"
            : localStorage.getItem("dermaloop-mode") === "demo_fixture"
              ? "demo_fixture"
              : "live";
        let data = await load(ns);
        if (
          ns === "demo_fixture" &&
          !data.scans.length &&
          new URLSearchParams(location.search).get("sample") === "1"
        ) {
          data = sample();
          await save(data);
        }
        if (active) {
          setW(data);
          const query = new URLSearchParams(location.search);
          const from = data.scans.findIndex((v) => v.id === query.get("from"));
          const to = data.scans.findIndex((v) => v.id === query.get("to"));
          if (from >= 0) setFirst(from);
          if (to >= 0) setLast(to);
          localStorage.setItem("dermaloop-mode", ns);
          setReady(true);
          setReduced(localStorage.getItem("dermaloop-motion") === "reduced");
          setContrast(localStorage.getItem("dermaloop-contrast") === "high");
        }
      } catch {
        setError(
          "Browser storage unavailable. Enable local storage to save your notebook.",
        );
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function update(next: Workspace) {
    try {
      await save(next);
      setW(next);
      setError("");
      return true;
    } catch {
      setError(
        "Could not save. Your browser may be out of storage. Export your notebook before leaving.",
      );
      return false;
    }
  }
  async function switchMode(ns: Workspace["namespace"]) {
    try {
      localStorage.setItem("dermaloop-mode", ns);
      const data = await load(ns);
      if (!(await update(data))) return;
      localStorage.setItem("dermaloop-mode", ns);
      setSelected(-1);
      setFirst(0);
      setLast(-1);
    } catch {
      setError("Could not load notebook.");
    }
  }
  async function seed() {
    const data = sample();
    if (!(await update(data))) return;
    localStorage.setItem("dermaloop-mode", "demo_fixture");
  }
  const isDemo = w.namespace === "demo_fixture",
    scan =
      w.scans[selected < 0 ? w.scans.length - 1 : selected] || w.scans.at(-1),
    a = w.scans[first],
    b = w.scans[last < 0 ? w.scans.length - 1 : last];
  const result = compare(a, b, metric);
  const title =
    section === "scan"
      ? "A moment for your skin."
      : section === "privacy"
        ? "Personal, by design."
        : section === "routine"
          ? "Change one thing. Learn a little."
          : section === "decision"
            ? "A thoughtful next step."
            : section === "timeline"
              ? "Find the signal. Question the noise."
              : "A little closer to understanding.";
  return (
    <div
      className={`workspace ${reduced ? "reduce-motion" : ""} ${contrast ? "high-contrast" : ""}`}
    >
      <aside className="sidebar">
        <Link href="/" aria-label="DermaLoop home">
          <Brand />
        </Link>
        <div className="sidebar-label">YOUR SKIN NOTEBOOK</div>
        <nav>
          {tabs.map((t) => (
            <Link
              key={t.id}
              aria-current={section === t.id ? "page" : undefined}
              href={t.id === "atlas" ? "/app" : `/app/${t.id}`}
            >
              <t.icon size={18} />
              {t.name}
              {section === t.id && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-note">
            <span className="mini-loop">◎</span>
            <p>
              Progress isn’t a straight line.
              <br />
              Neither is your skin story.
            </p>
          </div>
          <Link href="/app/privacy">
            <ShieldCheck size={17} /> Privacy & settings
          </Link>
          <Link href="/">← Back to the philosophy</Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <Link
            className="mobile-privacy"
            href="/app/privacy"
            aria-label="Privacy and settings"
          >
            <ShieldCheck size={18} />
          </Link>
          <span>
            THE DERMALOOP NOTEBOOK <span className="slash">/</span>{" "}
            {tabs.find((t) => t.id === section)?.name ||
              (section === "scan" ? "Scan Studio" : "Privacy")}
          </span>
          <span className="status-pill">
            <span className="dot" />
            {isDemo ? "Illustrative sample" : "Your private notebook"}
          </span>
        </header>
        <main className="app-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow">
                {isDemo
                  ? "A FICTIONAL JOURNEY · OCTOBER 2026"
                  : "OBSERVE. UNDERSTAND. REVISIT."}
              </div>
              <h1>{title}</h1>
              <p>
                {section === "atlas"
                  ? "Your skin, with a little more context. Start with a signal, not a judgment."
                  : section === "timeline"
                    ? "Two readings tell a richer story when you keep the context in view."
                    : section === "routine"
                      ? "Keep a record of what you try, without rushing to a conclusion."
                      : section === "decision"
                        ? "More perspective before the next purchase. Every suggestion shows its reasoning."
                        : section === "scan"
                          ? "A single scan is a starting point. Let’s make it a considered one."
                          : "Your notebook belongs to you. So do the decisions about it."}
              </p>
            </div>
            {section !== "scan" && section !== "privacy" && (
              <Link className="button" href="/app/scan">
                <Plus size={16} /> New reading
              </Link>
            )}
          </div>
          {isDemo && (
            <div className="demo-banner">
              <span>
                <span className="tag">SAMPLE JOURNEY</span> Fictional readings,
                real product experience. No selfie was analyzed.
              </span>
              <button className="plain" onClick={() => switchMode("live")}>
                Open my notebook <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {isDemo && (
            <nav className="journey-progress" aria-label="Sample journey steps">
              {tabs.map((t, i) => (
                <Link
                  key={t.id}
                  href={
                    t.id === "atlas" ? "/app?sample=1" : `/app/${t.id}?sample=1`
                  }
                  aria-current={section === t.id ? "step" : undefined}
                >
                  <span>0{i + 1}</span> {t.name}
                </Link>
              ))}
              <Link href="/verification">Verified YouCam test ↗</Link>
            </nav>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="storage-notice">
              {notice}
            </p>
          )}
          {!ready ? (
            <p role="status">Opening your notebook…</p>
          ) : (
            <>
              {section === "atlas" &&
                (w.scans.length ? (
                  <>
                    <div className="atlas-grid">
                      <section className="panel atlas-visual">
                        <div className="panel-heading">
                          <span className="eyebrow">YOUR SKIN ATLAS</span>
                          <span className="tag">
                            {isDemo ? "ILLUSTRATIVE" : "SCORES ONLY"}
                          </span>
                        </div>
                        <Face />
                        <div className="atlas-caption">
                          <span className="dot" />
                          {labels[metric]}
                          <span>
                            Original illustration · no detection overlay
                          </span>
                        </div>
                      </section>
                      <section className="panel signal-panel">
                        <div className="panel-heading">
                          <span className="eyebrow">SIGNALS, NOT LABELS</span>
                          <SlidersHorizontal size={16} />
                        </div>
                        <label className="reading-label">
                          Reading
                          <select
                            aria-label="Atlas reading"
                            value={scan?.id}
                            onChange={(e) =>
                              setSelected(
                                w.scans.findIndex(
                                  (s) => s.id === e.target.value,
                                ),
                              )
                            }
                          >
                            {w.scans.map((s) => (
                              <option key={s.id} value={s.id}>
                                {date(s.capturedAt)} ·{" "}
                                {s.source === "live" ? "Live" : "Sample"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="metric-list">
                          {metrics.map((m) => {
                            const v = scan?.scores.find(
                              (s) => s.metricKey === m && s.region === "whole",
                            )?.rawScore;
                            return (
                              <button
                                className={
                                  metric === m ? "metric selected" : "metric"
                                }
                                key={m}
                                onClick={() => setMetric(m)}
                                aria-pressed={metric === m}
                              >
                                <span>{labels[m]}</span>
                                <span className="metric-track">
                                  <span style={{ width: `${v ?? 0}%` }} />
                                </span>
                                <b>{v ?? "—"}</b>
                                <ChevronRight size={14} />
                              </button>
                            );
                          })}
                        </div>
                        <p className="microcopy">
                          Provider raw scores / 100. Higher means better rated
                          condition, not a medical assessment. UI-adjusted
                          scores are shown separately in the data table.
                        </p>
                      </section>
                    </div>
                    <div className="lower-grid">
                      <section className="panel">
                        <div className="panel-heading">
                          <h2>{labels[metric]}, over time</h2>
                          <span className="tag">
                            RAW SCORE · {isDemo ? "SAMPLE" : "LIVE"}
                          </span>
                        </div>
                        <Chart scans={w.scans.slice(-4)} metric={metric} />
                        <p className="microcopy">
                          {w.scans.length === 1
                            ? "Your baseline is ready. Return later to see a trend."
                            : "Same API version, mode and region only. A numerical change is not proof of a skincare outcome."}
                        </p>
                      </section>
                      <section className="context-card">
                        <span className="eyebrow">THE CONTEXT MATTERS</span>
                        <h2>
                          A reading is
                          <br />
                          <em>only part of the story.</em>
                        </h2>
                        <p>{result.warning}</p>
                        <Link className="text-link" href="/app/timeline">
                          Explore Signal vs. Noise <ArrowRight size={16} />
                        </Link>
                        <div className="provenance">
                          {isDemo
                            ? "Fictional fixture shaped like YouCam JSON"
                            : "YouCam Skin Analysis"}
                          <br />
                          API {scan?.apiVersion} · SD · whole face
                        </div>
                      </section>
                    </div>
                  </>
                ) : (
                  <Empty seed={seed} />
                ))}
              {section === "timeline" &&
                (w.scans.length ? (
                  <>
                    <section className="panel">
                      <div className="compare-controls">
                        <label>
                          Earlier reading
                          <select
                            value={a?.id}
                            onChange={(e) =>
                              setFirst(
                                w.scans.findIndex(
                                  (s) => s.id === e.target.value,
                                ),
                              )
                            }
                          >
                            {w.scans.map((s) => (
                              <option key={s.id} value={s.id}>
                                {date(s.capturedAt)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <ArrowRight size={22} />
                        <label>
                          Later reading
                          <select
                            value={b?.id}
                            onChange={(e) =>
                              setLast(
                                w.scans.findIndex(
                                  (s) => s.id === e.target.value,
                                ),
                              )
                            }
                          >
                            {w.scans.map((s) => (
                              <option key={s.id} value={s.id}>
                                {date(s.capturedAt)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Signal
                          <select
                            value={metric}
                            onChange={(e) => setMetric(e.target.value)}
                          >
                            {metrics.map((m) => (
                              <option key={m} value={m}>
                                {labels[m]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="comparison-head">
                        <div>
                          <div className="eyebrow">
                            {labels[metric]} · PROVIDER RAW SCORE
                          </div>
                          <div className="delta">
                            {result.delta === null
                              ? "—"
                              : `${result.delta > 0 ? "+" : ""}${result.delta}`}
                            <span>
                              {" "}
                              {result.delta === null
                                ? "No comparable delta"
                                : "points between readings"}
                            </span>
                          </div>
                        </div>
                        <p>{result.warning}</p>
                      </div>
                      <Chart
                        scans={a && b && a.id !== b.id ? [a, b] : a ? [a] : []}
                        metric={metric}
                      />
                    </section>
                    <section className="capture-grid">
                      <div className="panel">
                        <div className="eyebrow">CAPTURE CONSISTENCY</div>
                        <h2>Different light, different story.</h2>
                        <table>
                          <thead>
                            <tr>
                              <th>Measurement</th>
                              <th>{a ? date(a.capturedAt) : "Earlier"}</th>
                              <th>{b ? date(b.capturedAt) : "Later"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Brightness / 255</td>
                              <td>{a?.capture.brightness.toFixed(0)}</td>
                              <td>{b?.capture.brightness.toFixed(0)}</td>
                            </tr>
                            <tr>
                              <td>Edge sharpness proxy</td>
                              <td>{a?.capture.sharpness.toFixed(0)}</td>
                              <td>{b?.capture.sharpness.toFixed(0)}</td>
                            </tr>
                            <tr>
                              <td>Front view reported</td>
                              <td>{a?.capture.frontView ? "Yes" : "No"}</td>
                              <td>{b?.capture.frontView ? "Yes" : "No"}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="microcopy">
                          {isDemo
                            ? "Sample measurements are illustrative. "
                            : ""}
                          Brightness and edge measurements describe the photo,
                          not diagnostic accuracy. They cannot verify pose,
                          exposure equivalence or skin condition.
                        </p>
                      </div>
                      <div className="context-card">
                        <span className="eyebrow">WHAT THIS CAN TELL YOU</span>
                        <h2>
                          Observe a change.
                          <br />
                          <em>Leave room for why.</em>
                        </h2>
                        <p>
                          Routine, lighting, sleep and time can all influence a
                          reading. Even a compatible comparison cannot establish
                          what caused it.
                        </p>
                        <Link href="/app/routine" className="text-link">
                          Add the routine context <ArrowRight size={16} />
                        </Link>
                      </div>
                    </section>
                  </>
                ) : (
                  <Empty seed={seed} />
                ))}
              {section === "routine" && <RoutineLab w={w} update={update} />}
              {section === "decision" && (
                <DecisionStudio w={w} update={update} />
              )}
              {section === "scan" && (
                <ScanStudio
                  onScan={async (s) => {
                    const real = await load("live");
                    const saved = await update({
                      ...real,
                      scans: [...real.scans.filter((v) => v.id !== s.id), s],
                    });
                    if (!saved)
                      throw new Error(
                        "Provider reading completed but could not be saved in this browser",
                      );
                    localStorage.setItem("dermaloop-mode", "live");
                  }}
                />
              )}
              {section === "privacy" && (
                <div className="settings-grid">
                  <section className="panel">
                    <ShieldCheck size={30} strokeWidth={1} />
                    <h2>A notebook in your browser.</h2>
                    <p>
                      Scores, routine notes and decision cards live in IndexedDB
                      on this device. Face images are never persisted by
                      DermaLoop. No analytics, ads or third-party face
                      galleries.
                    </p>
                    <h3>When you choose a live scan</h3>
                    <p>
                      Your image passes through our server in memory to Perfect
                      Corp’s YouCam service. Their retention documentation
                      currently states 30 days for uploaded and generated media;
                      download links expire after 2 hours. Clearing this
                      notebook does not delete the provider’s copy.
                    </p>
                    <p>
                      <a
                        href="https://docs.makeupar.com/develop/file_retention_period"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read provider retention policy ↗
                      </a>
                    </p>
                    <p className="microcopy">
                      Consent can be withdrawn before upload by canceling the
                      scan. Once submitted, stopping local polling does not
                      cancel the provider task or retract processing. This app
                      cannot request provider-side deletion.
                    </p>
                    <h3>Honest signals</h3>
                    <p>
                      YouCam is the analysis provider. Demo fixtures are
                      fictional. Raw scores and consumer-adjusted UI scores are
                      distinct. This is not a medical service, diagnosis or
                      evidence of treatment efficacy. Ask a qualified
                      professional about persistent concerns.
                    </p>
                  </section>
                  <section className="panel">
                    <div className="eyebrow">YOU’RE IN CONTROL</div>
                    <label>
                      Notebook
                      <select
                        aria-label="Notebook"
                        value={w.namespace}
                        onChange={(e) =>
                          switchMode(e.target.value as Workspace["namespace"])
                        }
                      >
                        <option value="live">My private notebook</option>
                        <option value="demo_fixture">Sample notebook</option>
                      </select>
                    </label>
                    <button className="button secondary" onClick={seed}>
                      Load / reset sample journey
                    </button>
                    <hr />
                    <h3>Take your notes with you</h3>
                    <button
                      className="button secondary"
                      onClick={() => {
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(w, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `dermaloop-${w.namespace}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export current notebook
                    </button>
                    <label className="file-label">
                      Import sample JSON
                      <input
                        type="file"
                        accept="application/json"
                        onChange={async (e) => {
                          try {
                            const f = e.target.files?.[0];
                            if (f) {
                              const next = parseImport(await f.text());
                              if (!(await update(next))) return;
                              setNotice(
                                "Sample notebook imported. All readings remain labeled fictional.",
                              );
                              localStorage.setItem(
                                "dermaloop-mode",
                                next.namespace,
                              );
                            }
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Invalid import",
                            );
                          }
                        }}
                      />
                    </label>
                    <p className="microcopy">
                      Sample imports are validated. Live imports are disabled so
                      edited JSON cannot impersonate provider-verified readings.
                    </p>
                    <hr />
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={reduced}
                        onChange={(e) => {
                          setReduced(e.target.checked);
                          localStorage.setItem(
                            "dermaloop-motion",
                            e.target.checked ? "reduced" : "default",
                          );
                        }}
                      />{" "}
                      Reduce motion
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={contrast}
                        onChange={(e) => {
                          setContrast(e.target.checked);
                          localStorage.setItem(
                            "dermaloop-contrast",
                            e.target.checked ? "high" : "default",
                          );
                        }}
                      />{" "}
                      Higher contrast
                    </label>
                    <button
                      className="danger"
                      onClick={async () => {
                        if (
                          confirm(
                            "Delete both notebooks from this browser? This cannot be undone.",
                          )
                        ) {
                          try {
                            await removeAll();
                            setW(empty("live"));
                            setSelected(-1);
                            setFirst(0);
                            setLast(-1);
                            localStorage.removeItem("dermaloop-mode");
                            setError("");
                            setNotice(
                              "Both notebooks deleted from this browser.",
                            );
                          } catch {
                            setError(
                              "Could not delete browser data. Please try again or clear this site's storage in your browser settings.",
                            );
                          }
                        }
                      }}
                    >
                      Delete all local data
                    </button>
                    <p className="microcopy">
                      Live scans are off by default. Private reviewer
                      credentials and explicit credit approval are required.
                      Public sample access is free.
                    </p>
                  </section>
                </div>
              )}
              {![
                "atlas",
                "timeline",
                "routine",
                "decision",
                "scan",
                "privacy",
              ].includes(section) && <Empty seed={seed} />}
            </>
          )}
          <div className="app-footnote">
            <span>LESS NOISE. MORE UNDERSTANDING.</span>
            <span>Not medical advice. Always your choice.</span>
          </div>
        </main>
      </div>
    </div>
  );
}
function Empty({ seed }: { seed: () => void }) {
  return (
    <section className="empty panel">
      <span className="mini-loop">◎</span>
      <h2>Your story starts here.</h2>
      <p>
        No readings yet. Create a private baseline, or explore a fictional
        journey to see how the notebook works.
      </p>
      <div className="hero-actions">
        <Link className="button" href="/app/scan">
          Start a reading <ArrowRight size={16} />
        </Link>
        <button className="button secondary" onClick={seed}>
          Explore sample journey
        </button>
      </div>
    </section>
  );
}
function RoutineLab({
  w,
  update,
}: {
  w: Workspace;
  update: (w: Workspace) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <>
      <div className="routine-toolbar">
        <span className="eyebrow">
          {w.routines.length} RECORDED EXPERIMENT
          {w.routines.length !== 1 ? "S" : ""}
        </span>
        <button className="button secondary" onClick={() => setOpen(!open)}>
          {open ? <X size={16} /> : <Plus size={16} />}{" "}
          {open ? "Close form" : "Log a routine change"}
        </button>
      </div>
      {open && (
        <form
          className="panel form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const r: Routine = {
              id: crypto.randomUUID(),
              label: String(d.get("label")),
              category: String(d.get("category")),
              products: String(d.get("products"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              startDate: String(d.get("start")),
              checkpoint: String(d.get("checkpoint")),
              notes: String(d.get("notes")),
              startScan: w.scans.at(-1)?.id,
              observations: [],
            };
            if (await update({ ...w, routines: [...w.routines, r] }))
              setOpen(false);
          }}
        >
          <label>
            Experiment name
            <input
              name="label"
              required
              maxLength={160}
              placeholder="e.g. A simpler evening routine"
            />
          </label>
          <label>
            Category
            <select name="category">
              <option>Simplify</option>
              <option>Add a product</option>
              <option>Maintain</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Product names (comma separated)
            <input
              name="products"
              maxLength={500}
              placeholder="Your own products, no catalog"
            />
          </label>
          <label>
            Start date
            <input
              name="start"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            In-app checkpoint
            <input name="checkpoint" type="date" required />
          </label>
          <label>
            Notes
            <textarea name="notes" maxLength={2000} />
          </label>
          <button className="button" type="submit">
            Save experiment <Check size={16} />
          </button>
        </form>
      )}
      {!w.routines.length && (
        <section className="panel empty">
          <h2>One change. A little patience.</h2>
          <p>
            Record an experiment above. A journal adds context; it doesn’t prove
            a product caused a score change.
          </p>
        </section>
      )}
      {w.routines.map((r) => (
        <article className="routine-card panel" key={r.id}>
          <div className="panel-heading">
            <span className="tag">
              {r.category} ·{" "}
              {w.namespace === "demo_fixture" ? "SAMPLE" : "YOUR NOTES"}
            </span>
            <span className="eyebrow">SINCE {r.startDate}</span>
          </div>
          <h2>{r.label}</h2>
          <div className="routine-content">
            <div>
              <span className="eyebrow">THE ROUTINE</span>
              <ul>
                {r.products.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <p>{r.notes}</p>
              <div className="checkpoint">
                Next checkpoint <b>{r.checkpoint}</b>{" "}
                <span>In-app reminder only</span>
              </div>
              {r.startScan && (
                <Link
                  href={`/app/timeline?from=${encodeURIComponent(r.startScan)}&to=${encodeURIComponent(w.scans.at(-1)?.id || r.startScan)}`}
                >
                  Review associated readings ↗
                </Link>
              )}
            </div>
            <div>
              <span className="eyebrow">OBSERVATION JOURNAL</span>
              {r.observations.map((o, i) => (
                <div className="observation" key={i}>
                  <small>{o.date}</small>
                  <p>{o.note}</p>
                </div>
              ))}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const saved = await update({
                    ...w,
                    routines: w.routines.map((v) =>
                      v.id === r.id
                        ? {
                            ...v,
                            observations: [
                              ...v.observations,
                              {
                                date: new Date().toISOString().slice(0, 10),
                                note: notes[r.id] || "",
                              },
                            ],
                          }
                        : v,
                    ),
                  });
                  if (saved)
                    setNotes((current) => ({ ...current, [r.id]: "" }));
                }}
              >
                <label>
                  Add a dated observation
                  <textarea
                    required
                    maxLength={2000}
                    value={notes[r.id] || ""}
                    onChange={(e) =>
                      setNotes((current) => ({
                        ...current,
                        [r.id]: e.target.value,
                      }))
                    }
                    placeholder="What changed? What stayed the same?"
                  />
                </label>
                <button className="button secondary" type="submit">
                  Save observation
                </button>
              </form>
            </div>
          </div>
          <div className="routine-bottom">
            <span>
              Keep observing. External factors can influence any reading.
            </span>
            <button
              className="plain"
              onClick={() =>
                update({
                  ...w,
                  routines: w.routines.filter((v) => v.id !== r.id),
                })
              }
            >
              Remove experiment
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
function DecisionStudio({
  w,
  update,
}: {
  w: Workspace;
  update: (w: Workspace) => Promise<boolean>;
}) {
  return (
    <div className="decision-grid">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const d = decide(
            String(f.get("question")),
            String(f.get("goal")),
            w.scans,
            w.routines,
          );
          await update({
            ...w,
            decisions: [
              ...w.decisions,
              {
                ...d,
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
              },
            ],
          });
        }}
      >
        <div className="eyebrow">BEFORE YOU ADD TO CART</div>
        <h2>What are you considering?</h2>
        <label>
          Your proposed purchase or plan
          <textarea
            name="question"
            required
            maxLength={500}
            placeholder="Should I try a new moisturizer?"
          />
        </label>
        <label>
          Signal you want to understand
          <select name="goal">
            {metrics.map((m) => (
              <option key={m} value={m}>
                {labels[m]}
              </option>
            ))}
          </select>
        </label>
        <p>
          We look at compatible readings, capture conditions and routine
          changes. No affiliate links. No product rankings.
        </p>
        <button type="submit" className="button">
          Find some perspective <ArrowRight size={16} />
        </button>
      </form>
      <section>
        {!w.decisions.length ? (
          <div className="context-card">
            <span className="eyebrow">A LITTLE ROOM TO THINK</span>
            <h2>
              You don’t always
              <br />
              <em>need something new.</em>
            </h2>
            <p>
              Enter a question to get a transparent decision card. If your
              notebook has no readings, we’ll say there isn’t enough evidence.
            </p>
          </div>
        ) : (
          w.decisions
            .slice()
            .reverse()
            .map((d) => (
              <article className="decision-card" key={d.id}>
                <span className="tag">
                  {w.namespace === "demo_fixture"
                    ? "SAMPLE NOTEBOOK"
                    : "YOUR NOTEBOOK"}{" "}
                  · {date(d.timestamp)}
                </span>
                <h2>{d.outcome}</h2>
                {d.goal && <p className="eyebrow">Signal: {labels[d.goal]}</p>}
                <p className="decision-question">“{d.question}”</p>
                <details open>
                  <summary>Why this suggestion?</summary>
                  <p>{d.explanation}</p>
                  <span className="eyebrow">RULE {d.rules.join(", ")}</span>
                  <p>
                    Evidence:{" "}
                    {d.evidence.length
                      ? d.evidence.map((id, i) => (
                          <Link
                            key={id}
                            href={`/app/timeline?from=${encodeURIComponent(d.evidence[0])}&to=${encodeURIComponent(d.evidence.at(-1)!)}`}
                          >
                            {i ? ", " : ""}
                            {date(
                              w.scans.find((s) => s.id === id)?.capturedAt ||
                                d.timestamp,
                            )}{" "}
                            ↗
                          </Link>
                        ))
                      : "No readings recorded"}
                  </p>
                </details>
                <p className="microcopy">{d.disclaimer}</p>
              </article>
            ))
        )}
      </section>
    </div>
  );
}
function ScanStudio({ onScan }: { onScan: (scan: SkinScan) => Promise<void> }) {
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<Awaited<
    ReturnType<typeof prepare>
  > | null>(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [complete, setComplete] = useState(false);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const photoRef = useRef(photo);
  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);
  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  };
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      controller.current?.abort();
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.preview);
    },
    [],
  );
  async function choose(file: File) {
    try {
      setError("");
      const p = await prepare(file);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open image");
    }
  }
  async function scan() {
    if (!PUBLIC_PROVIDER_ACCESS) {
      setError(
        "Public scanning is disabled. Your prepared image stays in this browser.",
      );
      return;
    }
    if (lock.current || !photo || !consent) return;
    lock.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    try {
      setPhase("Registering file → uploading → starting analysis");
      const r = await fetch("/api/scan/start", {
        method: "POST",
        body: photo.blob,
        headers: {
          "Content-Type": "image/jpeg",
          "x-reviewer-code": code,
          "x-consent": "perfectcorp-v1-adult",
          "x-capture": JSON.stringify(photo.capture),
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setPhase("Awaiting YouCam analysis. Checking every 10 seconds…");
      const deadline = Date.now() + 150000;
      while (Date.now() < deadline) {
        await new Promise<void>((res, rej) => {
          const t = setTimeout(() => {
            signal.removeEventListener("abort", abort);
            res();
          }, 10000);
          const abort = () => {
            clearTimeout(t);
            rej(new DOMException("Stopped", "AbortError"));
          };
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        });
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const s = await fetch("/api/scan/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-reviewer-code": code,
          },
          body: JSON.stringify({ token: data.token }),
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(Math.min(25000, remaining)),
          ]),
        });
        const status = await s.json();
        if (!s.ok) throw new Error(status.error);
        if (status.state === "success") {
          setPhase("Interpreting provider scores");
          await onScan(ScanSchema.parse(status.scan));
          URL.revokeObjectURL(photo.preview);
          setPhoto(null);
          setCode("");
          setComplete(true);
          return;
        }
      }
      throw new Error(
        "Polling timed out. The provider may still finish. Do not resubmit automatically.",
      );
    } catch (e) {
      setError(
        signal.aborted
          ? "Local polling stopped. A submitted provider task may still complete."
          : `${e instanceof Error ? e.message : "Scan failed"}. No automatic resubmission was made.`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
      setPhase("");
    }
  }
  return (
    <div className="scan-grid">
      <section className="panel scan-form">
        <div className="eyebrow">SCAN STUDIO / PRIVATE ADAPTER REVIEW</div>
        <div className="demo-banner">
          <span>
            Public live scanning is disabled. Photo preparation below stays
            local; public submissions are blocked.
          </span>
          <Link className="text-link" href="/verification">
            View the verified synthetic test ↗
          </Link>
        </div>
        {complete ? (
          <>
            <h2>Your baseline is ready.</h2>
            <p>A single reading is a starting point, never a trend.</p>
            <Link className="button" href="/app">
              Open your Skin Atlas <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <h2>Good light. A clear starting point.</h2>
            <p>
              Face forward in even daylight, without filters or makeup where
              possible. Use a JPEG or PNG. We correct orientation, resize and
              strip metadata in your browser.
            </p>
            <div className="consent-box">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={busy}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (!e.target.checked) {
                      stopCamera();
                      if (photo) URL.revokeObjectURL(photo.preview);
                      setPhoto(null);
                    }
                  }}
                />{" "}
                I am an adult and consent to sending my chosen face image to
                Perfect Corp / YouCam for skin analysis.
              </label>
              <p className="microcopy">
                Provider media retention is currently 30 days. DermaLoop stores
                only scores locally. A live task may consume approved API units.{" "}
                <Link href="/app/privacy">Privacy details ↗</Link>
              </p>
            </div>
            {consent && (
              <>
                <label className="upload-zone">
                  <Upload size={24} />
                  <b>Choose a photo</b>
                  <span>JPEG or PNG · up to 15 MB before resizing</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) choose(f);
                    }}
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const s = await navigator.mediaDevices.getUserMedia({
                        video: {
                          facingMode: "user",
                          width: 1280,
                          height: 1600,
                        },
                      });
                      stream.current = s;
                      setCamera(true);
                      setTimeout(() => {
                        if (video.current) {
                          video.current.srcObject = s;
                          video.current.play();
                        }
                      }, 50);
                    } catch {
                      setError(
                        "Camera permission unavailable. You can choose a photo instead.",
                      );
                    }
                  }}
                >
                  <ScanFace size={16} /> Use camera
                </button>
                {camera && (
                  <div>
                    <video
                      ref={video}
                      muted
                      playsInline
                      aria-label="Camera preview"
                    />
                    <button
                      className="button secondary"
                      onClick={() => {
                        const v = video.current!;
                        const c = document.createElement("canvas");
                        c.width = v.videoWidth;
                        c.height = v.videoHeight;
                        c.getContext("2d")!.drawImage(v, 0, 0);
                        c.toBlob(
                          (blob) => {
                            if (blob)
                              choose(
                                new File([blob], "camera.jpg", {
                                  type: "image/jpeg",
                                }),
                              );
                          },
                          "image/jpeg",
                          0.95,
                        );
                        stopCamera();
                      }}
                    >
                      Capture photo
                    </button>
                    <button className="plain" onClick={stopCamera}>
                      Close camera
                    </button>
                  </div>
                )}
                {photo && (
                  <div className="photo-review">
                    <img
                      src={photo.preview}
                      alt="Your selected image, held in browser memory"
                    />
                    <p>
                      Brightness {photo.capture.brightness.toFixed(0)} / 255 ·
                      edge proxy {photo.capture.sharpness.toFixed(0)}
                      <br />
                      {photo.capture.width} × {photo.capture.height} pixels
                    </p>
                    <p className="microcopy">
                      Photo measurements are capture hints only. They do not
                      validate skin condition or diagnostic accuracy.
                    </p>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={photo.capture.frontView}
                        disabled={busy}
                        onChange={(e) =>
                          setPhoto({
                            ...photo,
                            capture: {
                              ...photo.capture,
                              frontView: e.target.checked,
                            },
                          })
                        }
                      />{" "}
                      I’m facing forward, in even light.
                    </label>
                  </div>
                )}
                <label>
                  Private reviewer access code
                  <input
                    type="password"
                    autoComplete="off"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <p className="microcopy">
                  Live mode is disabled unless the owner configures credentials
                  and approves credit use. No key is needed for the sample
                  journey.
                </p>
                <button
                  className="button"
                  disabled={
                    !PUBLIC_PROVIDER_ACCESS ||
                    !photo ||
                    !photo.capture.frontView ||
                    !code ||
                    busy
                  }
                  onClick={scan}
                >
                  Submit approved live scan <ArrowUpRight size={16} />
                </button>
              </>
            )}
            {busy && <p role="status">{phase}</p>}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="plain"
              onClick={() => {
                controller.current?.abort();
                stopCamera();
                if (!busy) {
                  if (photo) URL.revokeObjectURL(photo.preview);
                  setPhoto(null);
                  setConsent(false);
                  setCode("");
                }
              }}
            >
              {busy
                ? "Stop local polling"
                : "Cancel / retract consent before upload"}
            </button>
          </>
        )}
      </section>
      <aside className="context-card">
        <span className="eyebrow">A MORE CONSIDERED CAPTURE</span>
        <h2>
          Your face.
          <br />
          <em>Your permission.</em>
        </h2>
        <ol>
          <li>Consent & prepare locally</li>
          <li>Register a secure upload</li>
          <li>Send image bytes to YouCam storage</li>
          <li>Start an asynchronous SD task</li>
          <li>Poll, validate & interpret raw scores</li>
        </ol>
        <p>
          There are no simulated live results. If the provider is unavailable,
          your reading will say so.
        </p>
        <Link className="text-link" href="/app?sample=1">
          Explore the sample instead <ArrowRight size={16} />
        </Link>
      </aside>
    </div>
  );
}
