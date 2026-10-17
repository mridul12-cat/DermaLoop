"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  CHOICE_KEY,
  createMusicController,
  type MusicState,
} from "@/lib/audio/controller";
type Controller = ReturnType<typeof createMusicController>;
const Context = createContext<{
  state: MusicState;
  toggle: () => void;
  off: () => void;
} | null>(null);
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null),
    controller = useRef<Controller | null>(null);
  const [state, setState] = useState<MusicState>({
    status: "paused",
    ready: false,
    remembered: true,
  });
  useEffect(() => {
    if (!audio.current) return;
    const instance = createMusicController(
      audio.current,
      {
        session: () => window.sessionStorage,
        persistent: () => window.localStorage,
      },
      setState,
    );
    controller.current = instance;
    let frame: number | undefined;
    // Defer until page readiness and one paint. StrictMode's rehearsal is canceled
    // before claiming the session, so it cannot create a second audio attempt.
    const ready = () => {
      frame = requestAnimationFrame(() => {
        if (document.querySelector(".cassette-player")) instance.autoplay();
      });
    };
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
    const storage = (event: StorageEvent) => {
      if (event.key === CHOICE_KEY) instance.preferenceChanged();
    };
    const pagehide = () => instance.stopForPageExit();
    window.addEventListener("storage", storage);
    window.addEventListener("pagehide", pagehide);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("load", ready);
      window.removeEventListener("storage", storage);
      window.removeEventListener("pagehide", pagehide);
      instance.dispose();
      controller.current = null;
    };
  }, []);
  return (
    <Context.Provider
      value={{
        state,
        toggle: () => controller.current?.toggle(),
        off: () => controller.current?.soundOff(),
      }}
    >
      {children}
      <audio
        ref={audio}
        preload="none"
        aria-hidden="true"
        data-morning-stillness
      />
    </Context.Provider>
  );
}
export default function CassettePlayer() {
  const context = useContext(Context);
  if (!context) return null;
  const { state, toggle } = context;
  const active = state.status === "playing",
    pausable = active || state.status === "loading";
  const label =
    state.status === "error"
      ? "Morning Stillness unavailable"
      : pausable
        ? "Pause Morning Stillness"
        : state.status === "off"
          ? "Turn music on and play Morning Stillness"
          : state.status === "ended"
            ? "Play Morning Stillness again"
            : "Play Morning Stillness";
  const note = state.status === "blocked"
    ? "A little music? Tap to play."
    : state.status === "error" ? "Music unavailable." : null;
  return (
    <div
      className="cassette-player"
      role="group"
      aria-label="Morning Stillness music"
      data-playback={state.status}
    >
      <div className="cassette-controls">
        <button
          className="cassette-toggle"
          type="button"
          onClick={toggle}
          disabled={!state.ready || state.status === "error"}
          aria-label={label}
          title={label}
        >
          <svg className="cassette-art" viewBox="0 0 128 65" aria-hidden="true">
            <rect
              x="2"
              y="3"
              width="124"
              height="58"
              rx="5"
              className="cassette-case"
            />
            <rect
              x="9"
              y="9"
              width="110"
              height="34"
              rx="2"
              className="cassette-label"
            />
            <text x="64" y="18" textAnchor="middle">
              Morning Stillness
            </text>
            <path d="M33 29h62" className="cassette-tape" />
            {[33, 95].map((cx) => (
              <g className="cassette-reel" key={cx}>
                <circle cx={cx} cy="31" r="9" />
                <circle cx={cx} cy="31" r="3" />
                {[0, 60, 120].map((angle) => (
                  <path
                    key={angle}
                    d={`M${cx} 24v14`}
                    transform={`rotate(${angle} ${cx} 31)`}
                  />
                ))}
              </g>
            ))}
            <path d="m35 60 7-12h44l7 12" className="cassette-base" />
            <circle cx="11" cy="53" r="1.2" />
            <circle cx="117" cy="53" r="1.2" />
          </svg>
          <span className="cassette-transport" aria-hidden="true">
            {pausable ? <Pause size={10} /> : <Play size={10} />}
          </span>
        </button>
      </div>
      {note && <span className="cassette-note">{note}</span>}
      <span className="cassette-tooltip" aria-hidden="true">
        {label}.
      </span>
    </div>
  );
}
