import { emptyCommands, type Commands, type Fighter } from "./fighter";

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  owner: Fighter;
  life: number;
  colors: string[];
  dead: boolean;
  damage: number;
}

export interface Difficulty {
  decisionInterval: number;
  aggression: number; // 0..1 chance to attack when in range
  blockChance: number; // chance to block a seen attack
  fireballChance: number;
  jumpChance: number;
  mistakeChance: number; // chance to do nothing / whiff
}

export function difficultyFor(level: number): Difficulty {
  const l = Math.min(level, 10);
  return {
    decisionInterval: Math.max(7, 20 - l * 1.5),
    aggression: Math.min(0.92, 0.45 + l * 0.06),
    blockChance: Math.min(0.75, 0.12 + l * 0.08),
    fireballChance: Math.min(0.45, 0.1 + l * 0.05),
    jumpChance: Math.min(0.35, 0.08 + l * 0.03),
    mistakeChance: Math.max(0.03, 0.3 - l * 0.035),
  };
}

export class AIController {
  private cmd: Commands = emptyCommands();
  private timer = 0;
  private holdFrames = 0;
  diff: Difficulty;

  constructor(level: number) {
    this.diff = difficultyFor(level);
  }

  setLevel(level: number) {
    this.diff = difficultyFor(level);
  }

  reset() {
    this.cmd = emptyCommands();
    this.timer = 0;
    this.holdFrames = 0;
  }

  think(me: Fighter, foe: Fighter, projectiles: Projectile[]): Commands {
    // Clear edge-triggered buttons every frame; keep held directions.
    this.cmd.punch = false;
    this.cmd.kick = false;
    this.cmd.special = false;
    this.cmd.up = false;

    this.timer++;
    const d = this.diff;
    const dx = foe.x - me.x;
    const dist = Math.abs(dx);
    const toward: 1 | -1 = dx > 0 ? 1 : -1;

    // Reactive layer (runs every frame, gated by chance)
    const incoming = projectiles.find((p) => p.owner !== me && !p.dead && Math.sign(p.vx) === Math.sign(me.x - p.x) && Math.abs(p.x - me.x) < 60);
    if (incoming && me.canAct && this.holdFrames <= 0) {
      const r = Math.random();
      if (r < d.blockChance) {
        this.set({ block: true });
        this.holdFrames = 20;
      } else if (r < d.blockChance + d.jumpChance * 1.5) {
        this.set({ up: true, right: toward === 1, left: toward === -1 });
        this.holdFrames = 10;
      }
      return this.cmd;
    }

    const foeAttacking = foe.state === "attack" && foe.attack && foe.attack.kind !== "special" && foe.timer < foe.attack.startup + foe.attack.active;
    if (foeAttacking && dist < 44 && me.canAct && this.holdFrames <= 0 && Math.random() < d.blockChance) {
      const low = foe.attack!.type === "low";
      this.set({ block: true, down: low || (Math.random() < 0.3 && foe.attack!.type !== "overhead") });
      this.holdFrames = 12 + Math.random() * 8;
      return this.cmd;
    }

    if (this.holdFrames > 0) {
      this.holdFrames--;
      return this.cmd;
    }

    if (this.timer < d.decisionInterval) return this.cmd;
    this.timer = 0;

    // Deliberate layer
    if (Math.random() < d.mistakeChance) {
      this.set({});
      this.holdFrames = 6;
      return this.cmd;
    }

    // Foe lying: back off a step or wait
    if (foe.isDownedOrInvuln) {
      if (dist < 30) this.set({ left: toward === 1, right: toward === -1 });
      else this.set({});
      this.holdFrames = 8;
      return this.cmd;
    }

    if (dist > 110) {
      if (me.specialCd <= 0 && Math.random() < d.fireballChance * 1.5) {
        this.set({ special: true });
        this.holdFrames = 4;
      } else if (Math.random() < d.jumpChance) {
        this.set({ up: true, right: toward === 1, left: toward === -1 });
        this.holdFrames = 6;
      } else {
        this.set({ right: toward === 1, left: toward === -1 });
      }
      return this.cmd;
    }

    if (dist > 48) {
      const r = Math.random();
      if (me.specialCd <= 0 && r < d.fireballChance) {
        this.set({ special: true });
        this.holdFrames = 4;
      } else if (r < d.fireballChance + d.jumpChance) {
        // jump-in attack
        this.set({ up: true, right: toward === 1, left: toward === -1 });
        this.holdFrames = 6;
        setTimeout(() => {
          this.cmd.kick = true;
        }, 200);
      } else {
        this.set({ right: toward === 1, left: toward === -1 });
      }
      return this.cmd;
    }

    // In range
    if (foe.airborne && Math.random() < d.aggression) {
      this.set({ punch: true, down: true }); // anti-air uppercut
      this.holdFrames = 6;
      return this.cmd;
    }

    const r = Math.random();
    if (r < d.aggression) {
      const pick = Math.random();
      if (dist < 26 && pick < 0.25) this.set({ punch: true, down: true });
      else if (pick < 0.5) this.set({ punch: true });
      else if (pick < 0.8) this.set({ kick: true });
      else this.set({ kick: true, down: true });
      this.holdFrames = 4;
    } else if (r < d.aggression + 0.15) {
      this.set({ block: true, down: Math.random() < 0.4 });
      this.holdFrames = 14;
    } else {
      // retreat
      this.set({ left: toward === 1, right: toward === -1 });
      this.holdFrames = 10;
    }
    return this.cmd;
  }

  private set(partial: Partial<Commands>) {
    this.cmd = { ...emptyCommands(), ...partial };
  }
}
