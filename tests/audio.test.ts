import { describe, expect, it } from "vitest";
import {
  CHOICE_KEY,
  SESSION_KEY,
  claimAutoplay,
  createMusicController,
  type MusicState,
  type Stores,
  type AudioPort,
} from "../src/lib/audio/controller";
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function setup(choice?: string) {
  const session = storage(),
    persistent = storage();
  if (choice) persistent.setItem(CHOICE_KEY, choice);
  const stores: Stores = {
    session: () => session,
    persistent: () => persistent,
  };
  return { stores, session, persistent };
}
class Audio extends EventTarget {
  src = "";
  volume = 1;
  loop = true;
  preload = "auto";
  paused = true;
  ended = false;
  currentTime = 0;
  calls = 0;
  reject?: Error;
  async play() {
    this.calls++;
    if (this.reject) throw this.reject;
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
  load() {}
  removeAttribute() {
    this.src = "";
  }
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function controller(choice?: string) {
  const data = setup(choice),
    audio = new Audio(),
    states: MusicState[] = [];
  const controls = createMusicController(audio as AudioPort, data.stores, (s) =>
    states.push(s),
  );
  return { ...data, audio, states, controls };
}
describe("one session autoplay", () => {
  it("claims before playback, once per session", () => {
    const { stores, session } = setup();
    expect(claimAutoplay(stores)).toBe(true);
    expect(session.getItem(SESSION_KEY)).toBe("1");
    expect(claimAutoplay(stores)).toBe(false);
  });
  it("never autoplays a remembered opt-out", () => {
    const { stores } = setup("off");
    expect(claimAutoplay(stores)).toBe(false);
  });
  it("fails closed for inaccessible session or persistent storage", () => {
    const { stores } = setup();
    expect(
      claimAutoplay({
        ...stores,
        session: () => {
          throw Error();
        },
      }),
    ).toBe(false);
    expect(
      claimAutoplay({
        ...stores,
        persistent: () => {
          throw Error();
        },
      }),
    ).toBe(false);
  });
  it("sets 15% volume, no loop and no eager preload", () => {
    const { audio } = controller();
    expect(audio.volume).toBe(0.15);
    expect(audio.loop).toBe(false);
    expect(audio.preload).toBe("none");
  });
  it("catches blocked playback honestly and never retries automatically", async () => {
    const c = controller();
    c.audio.reject = new DOMException("blocked", "NotAllowedError");
    c.controls.autoplay();
    await flush();
    expect(c.states.at(-1)?.status).toBe("blocked");
    c.controls.autoplay();
    expect(c.audio.calls).toBe(1);
    c.audio.reject = undefined;
    c.controls.toggle();
    await flush();
    expect(c.states.at(-1)?.status).toBe("playing");
  });
  it("pauses/resumes without setting persistent sound off or restarting", async () => {
    const c = controller();
    c.controls.toggle();
    await flush();
    c.audio.currentTime = 12;
    c.controls.toggle();
    expect(c.states.at(-1)?.status).toBe("paused");
    expect(c.persistent.getItem(CHOICE_KEY)).toBe("on");
    c.controls.toggle();
    await flush();
    expect(c.audio.currentTime).toBe(12);
  });
  it("ends naturally and restarts only on manual request", async () => {
    const c = controller();
    c.controls.toggle();
    await flush();
    c.audio.currentTime = 33.567;
    c.audio.ended = true;
    c.audio.paused = true;
    c.audio.dispatchEvent(new Event("ended"));
    expect(c.states.at(-1)?.status).toBe("ended");
    expect(c.audio.calls).toBe(1);
    c.controls.toggle();
    await flush();
    expect(c.audio.currentTime).toBe(0);
    expect(c.audio.calls).toBe(2);
  });
  it("distinguishes sound off, remembers it and allows explicit opt-in", async () => {
    const c = controller();
    c.controls.soundOff();
    expect(c.persistent.getItem(CHOICE_KEY)).toBe("off");
    expect(c.states.at(-1)?.status).toBe("off");
    c.controls.autoplay();
    expect(c.audio.calls).toBe(0);
    c.controls.toggle();
    await flush();
    expect(c.persistent.getItem(CHOICE_KEY)).toBe("on");
    expect(c.states.at(-1)?.status).toBe("playing");
  });
  it("reports media loading failure with no retry", () => {
    const c = controller();
    c.audio.dispatchEvent(new Event("error"));
    expect(c.states.at(-1)?.status).toBe("error");
    c.controls.toggle();
    expect(c.audio.calls).toBe(0);
  });
  it("ignores a rejected stale promise after sound off", async () => {
    const c = controller();
    let reject!: (cause: Error) => void;
    c.audio.play = () => {
      c.audio.calls++;
      return new Promise<void>((_, r) => {
        reject = r;
      });
    };
    c.controls.toggle();
    c.controls.soundOff();
    reject(new DOMException("blocked", "NotAllowedError"));
    await flush();
    expect(c.states.at(-1)?.status).toBe("off");
  });
  it("cross-tab off stops music; storage events never start it", async () => {
    const c = controller();
    c.controls.toggle();
    await flush();
    c.persistent.setItem(CHOICE_KEY, "off");
    c.controls.preferenceChanged();
    expect(c.audio.paused).toBe(true);
    expect(c.states.at(-1)?.status).toBe("off");
    c.persistent.setItem(CHOICE_KEY, "on");
    c.controls.preferenceChanged();
    expect(c.audio.calls).toBe(1);
  });
  it("does not autoplay after an earlier manual choice", async () => {
    const c = controller();
    c.controls.toggle();
    await flush();
    c.controls.autoplay();
    expect(c.audio.calls).toBe(1);
  });
  it("cleans up source, listeners and playback", () => {
    const c = controller();
    c.controls.dispose();
    const count = c.states.length;
    c.audio.dispatchEvent(new Event("playing"));
    expect(c.audio.src).toBe("");
    expect(c.audio.paused).toBe(true);
    expect(c.states).toHaveLength(count);
  });
  it("page exit pauses without creating a persistent opt-out", () => {
    const c = controller();
    c.controls.stopForPageExit();
    expect(c.persistent.getItem(CHOICE_KEY)).toBeNull();
    expect(c.audio.paused).toBe(true);
  });
});
