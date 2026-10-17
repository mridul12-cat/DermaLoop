import CassettePlayer from "@/components/music-player";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import data from "@/lib/verified-baseline.json";
import { VerificationSchema } from "@/lib/verification";
const baseline = VerificationSchema.parse(data);
const displayScore = (value: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
const names = {
  acne: "Acne",
  pore: "Pores",
  texture: "Texture",
  redness: "Redness",
};
export const metadata = { title: "Verified YouCam integration · DermaLoop" };
export default function Verification() {
  return (
    <>
      <header className="site-header">
        <Link href="/" aria-label="DermaLoop home">
          <Brand />
        </Link>
        <Link className="button small" href="/app?sample=1">
          Explore the sample <ArrowRight size={16} />
        </Link>
        <CassettePlayer />
      </header>
      <main className="verification-page">
        <div className="eyebrow">
          INTEGRATION EVIDENCE / 01 VERIFIED BASELINE
        </div>
        <h1>
          A real connection.
          <br />
          <em>A thoughtful starting point.</em>
        </h1>
        <p className="verification-lead">
          One completed YouCam Skin Analysis V2.1 test, using an AI-generated
          adult portrait. These are genuine saved provider measurements. The
          fictional face makes this an integration test, not a skin-health
          assessment.
        </p>
        <div className="verification-provenance">
          <ShieldCheck size={20} />
          <strong>{baseline.sourceLabel}</strong>
          <span>{baseline.capturedDate} · four SD concerns · read only</span>
        </div>
        <div className="verification-grid">
          <section className="panel">
            <div className="panel-heading">
              <span className="eyebrow">ACTUAL PROVIDER MEASUREMENTS</span>
              <span className="tag">ONE READING</span>
            </div>
            <div className="verified-metrics">
              {baseline.metrics.map((row, index) => (
                <article
                  key={row.action}
                  data-reveal="measurement"
                  style={
                    {
                      "--enter-delay": `${index * 60}ms`,
                    } as React.CSSProperties
                  }
                >
                  <h2>{names[row.action]}</h2>
                  <div className="score-pair">
                    <div>
                      <span>Raw score</span>
                      <strong>{displayScore(row.raw)}</strong>
                      <div className="score-track" aria-hidden="true">
                        <i style={{ width: `${row.raw}%` }} />
                      </div>
                    </div>
                    <div>
                      <span>UI adjusted</span>
                      <strong>{displayScore(row.ui)}</strong>
                      <div className="score-track ui-score" aria-hidden="true">
                        <i style={{ width: `${row.ui}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="microcopy">
              Cards round to two decimals; exact saved values are in the table.
              Provider 0–100 scales. Raw and UI adjusted scores are distinct
              outputs, not diagnostic probabilities. No trend, confidence
              estimate or treatment benefit is inferred.
            </p>
            <details>
              <summary>View measurement table</summary>
              <table>
                <caption>
                  Genuine saved YouCam output · synthetic test image
                </caption>
                <thead>
                  <tr>
                    <th>SD action</th>
                    <th>Raw</th>
                    <th>UI adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  {baseline.metrics.map((row) => (
                    <tr key={row.action}>
                      <th>{row.action}</th>
                      <td>{row.raw}</td>
                      <td>{row.ui}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
          <aside className="context-card">
            <div className="eyebrow">WHAT WAS VERIFIED</div>
            <h2>
              The whole
              <br />
              <em>provider loop.</em>
            </h2>
            <ol className="verified-workflow">
              <li>File registration: HTTP 200</li>
              <li>Signed JPEG upload: HTTP 200</li>
              <li>V2.1 task creation: HTTP 200</li>
              <li>One status poll: success</li>
              <li>Four raw/UI measurements validated</li>
            </ol>
            <p>
              No extra analysis was made to build this page. Only an allowlisted
              score projection is published; the private baseline, portrait,
              credentials and provider identifiers are excluded.
            </p>
            <p>
              This fixed review is separate from your notebook. It cannot be
              edited, imported into a personal history or used as proof of
              clinical accuracy. Public provider scanning is disabled.
            </p>
            <Link className="text-link" href="/app?sample=1">
              Try the complete fictional journey <ArrowUpRight size={16} />
            </Link>
          </aside>
        </div>
        <section className="verification-next">
          <div>
            <div className="eyebrow">FROM SIGNAL TO DECISION</div>
            <h2>See what context adds.</h2>
            <p>
              Skin Atlas → Signal vs. Noise → Routine Lab → Decision Studio. The
              interactive journey uses clearly labeled fictional history, never
              invented live results.
            </p>
          </div>
          <Link className="button" href="/app?sample=1">
            Explore sample journey <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer>
        <Brand />
        <span>
          Verified integration. Synthetic image. No medical conclusions.
        </span>
      </footer>
    </>
  );
}
