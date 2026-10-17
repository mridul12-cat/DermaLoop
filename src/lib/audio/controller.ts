export const AUDIO_SOURCE = "/audio/Morning_Stillness.mp3";
export const SESSION_KEY = "dermaloop-music-attempted";
export const CHOICE_KEY = "dermaloop-music-choice";
export type MusicStatus =
  "paused" | "loading" | "playing" | "blocked" | "ended" | "off" | "error";
export type MusicState = {
  status: MusicStatus;
  ready: boolean;
  remembered: boolean;
};
type Store = Pick<Storage, "getItem" | "setItem">;
export type Stores = { session: () => Store; persistent: () => Store };
// Claim before play(), including rejection. If storage is unavailable, fail closed:
// manual playback remains available, but uncertain preference/session state never autoplays.
export function claimAutoplay(stores: Stores) {
  try {
    const session = stores.session();
    if (session.getItem(SESSION_KEY) === "1") return false;
    session.setItem(SESSION_KEY, "1");
    const choice = stores.persistent().getItem(CHOICE_KEY);
    return choice === null || choice === "on";
  } catch {
    return false;
  }
}
export type AudioPort = Pick<
  HTMLAudioElement,
  | "src"
  | "volume"
  | "loop"
  | "preload"
  | "paused"
  | "ended"
  | "currentTime"
  | "play"
  | "pause"
  | "load"
  | "addEventListener"
  | "removeEventListener"
  | "removeAttribute"
>;
export function createMusicController(
  audio: AudioPort,
  stores: Stores,
  publish: (state: MusicState) => void,
) {
  let disposed = false,
    revision = 0,
    off = false,
    status: MusicStatus = "paused",
    remembered = true;
  try {
    off = stores.persistent().getItem(CHOICE_KEY) === "off";
  } catch {
    /* No automatic playback without readable preferences. */
  }
  const emit = (next: MusicStatus) => {
    if (!disposed) {
      status = next;
      publish({ status: next, ready: true, remembered });
    }
  };
  const remember = (choice: "on" | "off") => {
    try {
      stores.persistent().setItem(CHOICE_KEY, choice);
      remembered = true;
    } catch {
      remembered = false;
    }
  };
  audio.src = AUDIO_SOURCE;
  audio.preload = "none";
  audio.volume = 0.15;
  audio.loop = false;
  const playing = () => {
    if (off) audio.pause();
    else emit("playing");
  };
  const paused = () => {
    if (!off && status !== "error" && !audio.ended) emit("paused");
  };
  const ended = () => emit(off ? "off" : "ended");
  const error = () => {
    revision++;
    emit("error");
  };
  const waiting = () => {
    if (!off && !audio.paused && status !== "error") emit("loading");
  };
  const events = { playing, pause: paused, ended, error, waiting };
  for (const [name, listener] of Object.entries(events))
    audio.addEventListener(name, listener);
  emit(off ? "off" : "paused");
  function markManualChoice() {
    try {
      stores.session().setItem(SESSION_KEY, "1");
    } catch {
      /* Automatic playback already fails closed. */
    }
  }
  async function play(manual: boolean) {
    if (disposed || status === "error") return;
    const ticket = ++revision;
    if (manual) {
      markManualChoice();
      off = false;
      remember("on");
    }
    if (off) return;
    if (audio.ended || status === "ended") audio.currentTime = 0;
    emit("loading");
    try {
      await audio.play();
      if (!disposed && ticket === revision && !off && !audio.paused)
        emit("playing");
    } catch (cause) {
      if (disposed || ticket !== revision || off) return;
      const name = cause instanceof Error ? cause.name : "";
      emit(
        name === "NotAllowedError"
          ? "blocked"
          : name === "AbortError"
            ? "paused"
            : "error",
      );
    }
  }
  return {
    autoplay() {
      if (!disposed && claimAutoplay(stores)) void play(false);
    },
    toggle() {
      if (status === "playing" || status === "loading") {
        revision++;
        audio.pause();
        emit("paused");
      } else void play(true);
    },
    enable() {
      if (disposed) return;
      markManualChoice();
      off = false;
      remember("on");
      emit("paused");
    },
    soundOff() {
      markManualChoice();
      revision++;
      off = true;
      remember("off");
      audio.pause();
      audio.currentTime = 0;
      emit("off");
    },
    stopForPageExit() {
      revision++;
      audio.pause();
      if (!off && status !== "error" && status !== "ended") emit("paused");
    },
    preferenceChanged() {
      try {
        if (stores.persistent().getItem(CHOICE_KEY) === "off") {
          revision++;
          off = true;
          audio.pause();
          emit("off");
        }
      } catch {
        /* A storage event is never a reason to start playback. */
      }
    },
    dispose() {
      disposed = true;
      revision++;
      for (const [name, listener] of Object.entries(events))
        audio.removeEventListener(name, listener);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
  };
}
