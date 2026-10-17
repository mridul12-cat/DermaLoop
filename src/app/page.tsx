import Link from "next/link";
import { Brand, Face } from "@/components/brand";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  ScanFace,
  Activity,
  Orbit,
} from "lucide-react";
export default function Home() {
  return (
    <>
      <header className="site-header">
        <Link href="/" aria-label="DermaLoop home">
          <Brand />
        </Link>
        <nav>
          <a href="#the-loop">The philosophy</a>
          <Link href="/app/privacy">Your privacy</Link>
        </nav>
        <Link className="button small" href="/verification">
          Verified integration <ArrowUpRight size={16} />
        </Link>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-line" /> A LITTLE SCIENCE. A LOT MORE
              CLARITY.
            </div>
            <h1>
              Your skin has
              <br />a story.
              <br />
              <em>Not a score.</em>
            </h1>
            <p>
              Compare readings. Test one routine change.
              <br />
              Think before your next skincare purchase, one
              <br className="desktop" /> thoughtful decision at a time.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/app?sample=1">
                Explore sample journey <ArrowRight size={18} />
              </Link>
              <Link className="text-link" href="/verification">
                See the verified YouCam test <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="trust">
              <ShieldCheck size={16} /> Private by design <span>·</span> No
              product pushing <span>·</span> Always your choice
            </div>
          </div>
          <div className="hero-art">
            <div className="art-top">
              <span>THE SKIN ATLAS</span>
              <span>FIG. 01 / AN ONGOING STORY</span>
            </div>
            <Face hero />
            <div className="float-label label-one">
              <span className="dot" /> Look beyond the surface
              <small>Observe. Understand. Revisit.</small>
            </div>
            <div className="float-label label-two">
              <span className="mini-wave">⌁</span> More context.
              <br />
              Less guesswork.
            </div>
            <div className="art-bottom">
              <span>ILLUSTRATION, NOT A SKIN ANALYSIS</span>
              <span>↗</span>
            </div>
          </div>
        </section>
        <div className="principle-strip">
          <span>POWERED BY PERSPECTIVE.</span>
          <p>
            Skin signals from <b>YouCam AI</b> <span> / </span> Context from you{" "}
            <span> / </span> Decisions that stay yours
          </p>
          <span className="sample-note">
            LIVE INTEGRATION VERIFIED · SYNTHETIC TEST
          </span>
        </div>
        <section className="philosophy" id="the-loop">
          <div>
            <div className="eyebrow">THE DERMALOOP PHILOSOPHY</div>
            <h2>
              Better questions.
              <br />
              <em>Better skin decisions.</em>
            </h2>
          </div>
          <p>
            One selfie can be a starting point. A little context can change the
            whole picture. Close the loop between what you see, what you try,
            and what you choose next.
          </p>
        </section>
        <section className="steps">
          {[
            {
              icon: ScanFace,
              n: "01",
              title: "Meet your skin",
              text: "A guided capture and an honest baseline. No labels. No judgments.",
              link: "Explore your Skin Atlas",
              href: "/app?sample=1",
            },
            {
              icon: Activity,
              n: "02",
              title: "Find the signal",
              text: "Compare readings with the light, the routine, and real life in mind.",
              link: "Understand Signal vs. Noise",
              href: "/app/timeline?sample=1",
            },
            {
              icon: Orbit,
              n: "03",
              title: "Choose with intention",
              text: "Track one change. Pause before a purchase. Give observation a little room.",
              link: "Enter the Decision Studio",
              href: "/app/decision?sample=1",
            },
          ].map((s) => (
            <article key={s.n}>
              <div className="step-top">
                <s.icon strokeWidth={1} size={33} />
                <span>{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <Link className="text-link" href={s.href}>
                {s.link}
                <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </section>
        <section className="manifesto">
          <div className="eyebrow">A NOTE ON TRUST</div>
          <h2>
            Your face is personal.
            <br />
            <em>We intend to keep it that way.</em>
          </h2>
          <p>
            Your notebook stays in this browser. Live scans send your chosen
            image to Perfect Corp only after consent. The sample journey uses
            clearly labeled fictional data.
          </p>
          <Link className="text-link" href="/app/privacy">
            Read our privacy promise <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer>
        <Brand />
        <p>Change less. Choose better.</p>
        <span>Not medical advice. Just a more thoughtful starting point.</span>
      </footer>
    </>
  );
}
