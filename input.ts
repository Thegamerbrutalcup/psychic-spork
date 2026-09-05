export type Action =
  | "left"
  | "right"
  | "up"
  | "down"
  | "punch"
  | "kick"
  | "block"
  | "special"
  | "pause";

const ACTIONS: Action[] = [
  "left",
  "right",
  "up",
  "down",
  "punch",
  "kick",
  "block",
  "special",
  "pause",
];

const KEYMAP: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  Space: "up",
  ArrowDown: "down",
  KeyS: "down",
  KeyJ: "punch",
  KeyZ: "punch",
  KeyK: "kick",
  KeyX: "kick",
  KeyL: "special",
  KeyC: "special",
  ShiftLeft: "block",
  ShiftRight: "block",
  KeyV: "block",
  KeyI: "block",
  Escape: "pause",
  KeyP: "pause",
  Enter: "pause",
};

export class Input {
  held: Record<Action, boolean> = {} as Record<Action, boolean>;
  private pressedThisFrame: Record<Action, boolean> = {} as Record<Action, boolean>;
  private queued: Record<Action, boolean> = {} as Record<Action, boolean>;
  /** Touch sources can hold an action; we OR them with the keyboard. */
  private touchHeld: Record<Action, boolean> = {} as Record<Action, boolean>;
  private keyHeld: Record<Action, boolean> = {} as Record<Action, boolean>;
  onAnyPress: (() => void) | null = null;

  constructor() {
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.pressedThisFrame[a] = false;
      this.queued[a] = false;
      this.touchHeld[a] = false;
      this.keyHeld[a] = false;
    }
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!this.keyHeld[a]) {
      this.keyHeld[a] = true;
      this.queued[a] = true;
      this.onAnyPress?.();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    this.keyHeld[a] = false;
  };

  private onBlur = () => {
    for (const a of ACTIONS) {
      this.keyHeld[a] = false;
      this.touchHeld[a] = false;
    }
  };

  /** Called by the touch controls. */
  setTouch(a: Action, down: boolean) {
    if (down && !this.touchHeld[a]) {
      this.queued[a] = true;
      this.onAnyPress?.();
    }
    this.touchHeld[a] = down;
  }

  /** Call once per simulation tick. */
  beginFrame() {
    for (const a of ACTIONS) {
      this.held[a] = this.keyHeld[a] || this.touchHeld[a];
      this.pressedThisFrame[a] = this.queued[a];
      this.queued[a] = false;
    }
  }

  pressed(a: Action) {
    return this.pressedThisFrame[a];
  }

  /** Consume a press so it isn't reused by another system. */
  consume(a: Action) {
    this.pressedThisFrame[a] = false;
  }
}
