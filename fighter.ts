import * as Poses from "./poses";
import type { Pose, Pt } from "./poses";
import type { FighterDef } from "./roster";

export type FState =
  | "idle"
  | "walk"
  | "crouch"
  | "jump"
  | "attack"
  | "block"
  | "crouchblock"
  | "hit"
  | "knockdown"
  | "launched"
  | "lying"
  | "getup"
  | "win"
  | "dizzy"
  | "dead"
  | "intro";

export type AttackKind =
  | "punch"
  | "kick"
  | "uppercut"
  | "sweep"
  | "jumpkick"
  | "jumppunch"
  | "special";

export type HitType = "high" | "mid" | "low" | "overhead" | "launch" | "knockdown";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AttackDef {
  kind: AttackKind;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  box: Box; // relative to feet, facing right, y negative up (top-left corner)
  knockback: number;
  hitstun: number;
  type: HitType;
  wind: Pose;
  hit: Pose;
  score: number;
  heavy: boolean;
  air?: boolean;
}

export const ATTACKS: Record<AttackKind, AttackDef> = {
  punch: {
    kind: "punch",
    startup: 3,
    active: 3,
    recovery: 7,
    damage: 5,
    box: { x: 8, y: -42, w: 17, h: 11 },
    knockback: 2.2,
    hitstun: 13,
    type: "high",
    wind: Poses.PUNCH_WIND,
    hit: Poses.PUNCH_HIT,
    score: 50,
    heavy: false,
  },
  kick: {
    kind: "kick",
    startup: 6,
    active: 4,
    recovery: 11,
    damage: 8,
    box: { x: 10, y: -38, w: 19, h: 13 },
    knockback: 3.5,
    hitstun: 17,
    type: "mid",
    wind: Poses.KICK_WIND,
    hit: Poses.KICK_HIT,
    score: 80,
    heavy: false,
  },
  uppercut: {
    kind: "uppercut",
    startup: 7,
    active: 4,
    recovery: 18,
    damage: 13,
    box: { x: 2, y: -60, w: 14, h: 40 },
    knockback: 2.5,
    hitstun: 40,
    type: "launch",
    wind: Poses.UPPER_WIND,
    hit: Poses.UPPER_HIT,
    score: 200,
    heavy: true,
  },
  sweep: {
    kind: "sweep",
    startup: 7,
    active: 5,
    recovery: 15,
    damage: 7,
    box: { x: 6, y: -9, w: 22, h: 9 },
    knockback: 2,
    hitstun: 30,
    type: "low",
    wind: Poses.SWEEP_WIND,
    hit: Poses.SWEEP_HIT,
    score: 120,
    heavy: false,
  },
  jumpkick: {
    kind: "jumpkick",
    startup: 4,
    active: 40,
    recovery: 0,
    damage: 9,
    box: { x: 8, y: -26, w: 19, h: 16 },
    knockback: 3,
    hitstun: 18,
    type: "overhead",
    wind: Poses.JUMP,
    hit: Poses.JUMP_KICK,
    score: 100,
    heavy: false,
    air: true,
  },
  jumppunch: {
    kind: "jumppunch",
    startup: 3,
    active: 8,
    recovery: 6,
    damage: 6,
    box: { x: 8, y: -34, w: 15, h: 12 },
    knockback: 2,
    hitstun: 14,
    type: "overhead",
    wind: Poses.JUMP,
    hit: Poses.JUMP_PUNCH,
    score: 60,
    heavy: false,
    air: true,
  },
  special: {
    kind: "special",
    startup: 11,
    active: 2,
    recovery: 18,
    damage: 0,
    box: { x: 0, y: 0, w: 0, h: 0 },
    knockback: 0,
    hitstun: 0,
    type: "mid",
    wind: Poses.SPECIAL_WIND,
    hit: Poses.SPECIAL_HIT,
    score: 0,
    heavy: false,
  },
};

export interface Commands {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  punch: boolean; // edge-triggered
  kick: boolean;
  special: boolean;
}

export const emptyCommands = (): Commands => ({
  left: false,
  right: false,
  up: false,
  down: false,
  block: false,
  punch: false,
  kick: false,
  special: false,
});

export const GRAVITY = 0.42;
export const JUMP_VEL = -6.9;
export const WALK_FWD = 1.45;
export const WALK_BACK = 1.1;
export const SPECIAL_COOLDOWN = 110;

export class Fighter {
  x = 0;
  y = 0; // height above ground (>= 0)
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  health = 100;
  maxHealth = 100;
  displayHealth = 100; // lagging red bar
  state: FState = "idle";
  timer = 0;
  attack: AttackDef | null = null;
  attackLanded = false;
  hitstun = 0;
  flash = 0;
  specialCd = 0;
  comboHits = 0; // hits landed in current combo (as attacker)
  comboTimer = 0;
  roundsWon = 0;
  tookDamageThisRound = false;
  animT = 0;
  damageMul = 1;
  isPlayer: boolean;
  def: FighterDef;
  onLand: (() => void) | null = null;
  onWhoosh: (() => void) | null = null;
  onFireball: ((f: Fighter) => void) | null = null;
  onJump: (() => void) | null = null;

  constructor(def: FighterDef, isPlayer: boolean) {
    this.def = def;
    this.isPlayer = isPlayer;
  }

  resetForRound(x: number, facing: 1 | -1) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.health = this.maxHealth;
    this.displayHealth = this.maxHealth;
    this.state = "intro";
    this.timer = 0;
    this.attack = null;
    this.hitstun = 0;
    this.flash = 0;
    this.specialCd = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.tookDamageThisRound = false;
  }

  get airborne() {
    return this.y > 0.01 || this.vy < 0;
  }

  get canAct() {
    return (
      this.state === "idle" ||
      this.state === "walk" ||
      this.state === "crouch" ||
      this.state === "block" ||
      this.state === "crouchblock"
    );
  }

  get isDownedOrInvuln() {
    return this.state === "lying" || this.state === "getup" || this.state === "dead";
  }

  get crouching() {
    return (
      this.state === "crouch" ||
      this.state === "crouchblock" ||
      (this.state === "attack" && (this.attack?.kind === "sweep" || (this.attack?.kind === "uppercut" && this.timer < this.attack.startup)))
    );
  }

  get inHitState() {
    return this.state === "hit" || this.state === "knockdown" || this.state === "launched" || this.state === "lying";
  }

  setState(s: FState) {
    if (this.state === s) return;
    this.state = s;
    this.timer = 0;
  }

  startAttack(kind: AttackKind) {
    this.attack = ATTACKS[kind];
    this.attackLanded = false;
    this.setState("attack");
    this.onWhoosh?.();
  }

  /** Returns active hitbox in world coords if attack is active this frame. */
  activeHitbox(): Box | null {
    if (this.state !== "attack" || !this.attack || this.attackLanded) return null;
    const a = this.attack;
    if (a.kind === "special") return null;
    const t = this.timer;
    if (t < a.startup || t >= a.startup + a.active) return null;
    return this.toWorld(a.box);
  }

  toWorld(b: Box): Box {
    const x = this.facing === 1 ? this.x + b.x : this.x - b.x - b.w;
    return { x, y: -this.y + b.y, w: b.w, h: b.h };
  }

  hurtbox(): Box | null {
    if (this.isDownedOrInvuln) return null;
    if (this.state === "knockdown" || this.state === "launched") {
      return { x: this.x - 8, y: -this.y - 30, w: 16, h: 30 };
    }
    const h = this.crouching ? 34 : 46;
    return { x: this.x - 6, y: -this.y - h, w: 12, h };
  }

  update(cmd: Commands, controllable: boolean, minX: number, maxX: number) {
    this.animT++;
    if (this.flash > 0) this.flash--;
    if (this.specialCd > 0) this.specialCd--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.comboHits = 0;
    }
    // Health bar lag
    if (this.displayHealth > this.health) {
      this.displayHealth = Math.max(this.health, this.displayHealth - 0.6);
    }

    const fwd = this.facing === 1 ? cmd.right : cmd.left;
    const back = this.facing === 1 ? cmd.left : cmd.right;

    // Gravity & airborne movement
    if (this.airborne) {
      this.vy += GRAVITY;
      this.y -= this.vy;
      this.x += this.vx;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.vx = 0;
        this.onLand?.();
        if (this.state === "knockdown" || this.state === "launched") {
          this.setState("lying");
        } else if (this.state === "jump" || this.state === "attack") {
          this.attack = null;
          this.setState("idle");
        }
      }
    } else {
      // ground friction for knockback slides
      if (this.state === "hit" || this.state === "block" || this.state === "crouchblock" || this.state === "dizzy") {
        this.x += this.vx;
        this.vx *= 0.8;
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
      } else if (this.state === "lying") {
        this.x += this.vx;
        this.vx *= 0.85;
      }
    }

    this.timer++;

    switch (this.state) {
      case "intro":
      case "win":
      case "dead":
        break;

      case "hit":
        if (this.timer >= this.hitstun) this.setState("idle");
        break;

      case "lying":
        if (this.timer >= 28 && this.health > 0) this.setState("getup");
        break;

      case "getup":
        if (this.timer >= 14) this.setState("idle");
        break;

      case "dizzy":
        break;

      case "knockdown":
      case "launched":
        break;

      case "attack": {
        const a = this.attack!;
        if (a.kind === "special" && this.timer === a.startup) {
          this.onFireball?.(this);
        }
        if (!a.air && this.timer >= a.startup + a.active + a.recovery) {
          this.attack = null;
          this.setState("idle");
        } else if (a.kind === "jumppunch" && this.timer >= a.startup + a.active + a.recovery) {
          this.attack = null;
          this.setState("jump");
        }
        break;
      }

      case "jump":
        if (controllable) {
          if (cmd.kick) this.startAttack("jumpkick");
          else if (cmd.punch) this.startAttack("jumppunch");
        }
        break;

      default:
        break;
    }

    if (controllable && this.canAct) {
      this.handleNeutral(cmd, fwd, back);
    } else if (!controllable && this.canAct) {
      this.setState("idle");
    }

    // Bounds
    if (this.x < minX) {
      this.x = minX;
      if (this.airborne && this.vx < 0) this.vx = 0;
    }
    if (this.x > maxX) {
      this.x = maxX;
      if (this.airborne && this.vx > 0) this.vx = 0;
    }
  }

  private handleNeutral(cmd: Commands, fwd: boolean, back: boolean) {
    // Attacks take priority
    if (cmd.special && this.specialCd <= 0) {
      this.specialCd = SPECIAL_COOLDOWN;
      this.startAttack("special");
      return;
    }
    if (cmd.punch) {
      this.startAttack(cmd.down ? "uppercut" : "punch");
      return;
    }
    if (cmd.kick) {
      this.startAttack(cmd.down ? "sweep" : "kick");
      return;
    }
    if (cmd.up) {
      this.vy = JUMP_VEL;
      this.y = 0.02;
      this.vx = fwd ? WALK_FWD * 1.4 : back ? -WALK_BACK * 1.4 : 0;
      this.vx *= this.facing;
      this.setState("jump");
      this.onJump?.();
      return;
    }
    if (cmd.block) {
      this.setState(cmd.down ? "crouchblock" : "block");
      return;
    }
    if (cmd.down) {
      this.setState("crouch");
      return;
    }
    if (fwd) {
      this.x += WALK_FWD * this.facing;
      this.setState("walk");
      return;
    }
    if (back) {
      this.x -= WALK_BACK * this.facing;
      this.setState("walk");
      return;
    }
    this.setState("idle");
  }

  /** Whether an incoming hit of this type is blocked given current state. */
  blocks(type: HitType): boolean {
    if (this.state === "block") return type !== "low";
    if (this.state === "crouchblock") return type !== "overhead";
    return false;
  }

  applyHit(type: HitType, damage: number, knockback: number, hitstun: number, dir: 1 | -1) {
    this.health = Math.max(0, this.health - damage);
    this.tookDamageThisRound = true;
    this.flash = 4;
    this.attack = null;
    const airborne = this.airborne;
    if (type === "launch" || airborne) {
      this.setState("launched");
      this.vy = type === "launch" ? -7.2 : -4.5;
      this.vx = dir * (type === "launch" ? 2.2 : knockback);
      this.y = Math.max(this.y, 0.05);
    } else if (type === "knockdown" || type === "low") {
      this.setState("knockdown");
      this.vy = -3.2;
      this.vx = dir * knockback;
      this.y = 0.05;
    } else {
      this.setState("hit");
      this.hitstun = hitstun;
      this.vx = dir * knockback;
    }
    if (this.health <= 0 && this.state === "hit") {
      // Final blow always knocks down
      this.setState("knockdown");
      this.vy = -3.5;
      this.vx = dir * (knockback + 1);
      this.y = 0.05;
    }
  }

  applyBlock(chip: number, knockback: number, dir: 1 | -1) {
    this.health = Math.max(1, this.health - chip);
    this.vx = dir * knockback;
    this.timer = 0;
  }

  // ---------- Rendering ----------

  currentPose(): Pose {
    const t = this.timer;
    const s = this.state;
    switch (s) {
      case "idle":
      case "intro": {
        const bob = Math.sin(this.animT / 9) * 0.8;
        return shiftUpper(Poses.IDLE, bob);
      }
      case "win": {
        const bob = Math.sin(this.animT / 5) * 1.5;
        return t < 12 ? Poses.lerpPose(Poses.IDLE, Poses.WIN, t / 12) : shiftUpper(Poses.WIN, bob);
      }
      case "walk": {
        const k = (Math.sin(this.animT * 0.28) + 1) / 2;
        return Poses.lerpPose(Poses.WALK_A, Poses.WALK_B, k);
      }
      case "crouch":
        return t < 3 ? Poses.lerpPose(Poses.IDLE, Poses.CROUCH, t / 3) : Poses.CROUCH;
      case "block":
        return t < 3 ? Poses.lerpPose(Poses.IDLE, Poses.BLOCK, t / 3) : Poses.BLOCK;
      case "crouchblock":
        return Poses.CROUCH_BLOCK;
      case "jump":
        return t < 4 ? Poses.lerpPose(Poses.IDLE, Poses.JUMP, t / 4) : Poses.JUMP;
      case "attack": {
        const a = this.attack!;
        const from = a.air ? Poses.JUMP : this.crouchingStart(a) ? Poses.CROUCH : Poses.IDLE;
        if (t < a.startup) return Poses.lerpPose(from, a.wind, Math.min(1, (t + 1) / a.startup));
        if (t < a.startup + a.active) return a.hit;
        const rt = (t - a.startup - a.active) / Math.max(1, a.recovery);
        return Poses.lerpPose(a.hit, from, Math.min(1, rt * 1.2));
      }
      case "hit":
        return this.crouching || this.hitstun < 0 ? Poses.HIT_LOW : Poses.lerpPose(Poses.HIT_HIGH, Poses.IDLE, Math.min(1, t / this.hitstun));
      case "knockdown":
        return Poses.KNOCKBACK_AIR;
      case "launched":
        return Poses.LAUNCHED;
      case "lying":
      case "dead":
        return t < 3 ? Poses.lerpPose(Poses.KNOCKBACK_AIR, Poses.LYING, t / 3) : Poses.LYING;
      case "getup":
        return t < 7 ? Poses.lerpPose(Poses.LYING, Poses.CROUCH, t / 7) : Poses.lerpPose(Poses.CROUCH, Poses.IDLE, (t - 7) / 7);
      case "dizzy": {
        const sway = Math.sin(this.animT / 6) * 2;
        const p = shiftUpper(Poses.DIZZY, Math.sin(this.animT / 4));
        return { ...p, head: [p.head[0] + sway, p.head[1]], neck: [p.neck[0] + sway * 0.5, p.neck[1]] };
      }
    }
  }

  private crouchingStart(a: AttackDef) {
    return a.kind === "uppercut" || a.kind === "sweep";
  }

  draw(ctx: CanvasRenderingContext2D, groundY: number) {
    const pose = this.currentPose();
    const pal = this.def.palette;
    const white = this.flash > 0 && this.flash % 2 === 0;
    const ox = Math.round(this.x);
    const oy = Math.round(groundY - this.y);
    const f = this.facing;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const sw = Math.max(8, 20 - this.y * 0.15);
    ctx.fillRect(Math.round(ox - sw / 2), groundY - 1, Math.round(sw), 2);

    const W = (x: number) => ox + Math.round(x) * f;
    const H = (y: number) => oy + Math.round(y);
    const col = (c: string) => (white ? "#ffffff" : c);

    const line = (a: Pt, b: Pt, width: number, color: string) => {
      const x0 = W(a[0]);
      const y0 = H(a[1]);
      const x1 = W(b[0]);
      const y1 = H(b[1]);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
      const half = Math.floor(width / 2);
      ctx.fillStyle = col(color);
      for (let i = 0; i <= steps; i++) {
        const px = Math.round(x0 + (dx * i) / steps) - half;
        const py = Math.round(y0 + (dy * i) / steps) - half;
        ctx.fillRect(px, py, width, width);
      }
    };
    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = col(color);
      const rx = f === 1 ? W(x) : W(x) - w + 1;
      ctx.fillRect(rx, H(y), w, h);
    };

    const shoulder: Pt = [pose.neck[0], pose.neck[1] + 3];
    const bShoulder: Pt = [pose.neck[0] - 1, pose.neck[1] + 3];

    // Back arm & back leg (darker)
    line(bShoulder, pose.bElbow, 3, pal.dark);
    line(pose.bElbow, pose.bHand, 3, pal.dark);
    rect(pose.bHand[0] - 1, pose.bHand[1] - 1, 3, 3, shade(pal.skin));
    line(pose.hip, pose.bKnee, 3, pal.dark);
    line(pose.bKnee, pose.bFoot, 3, pal.dark);
    rect(pose.bFoot[0] - 1, pose.bFoot[1] - 2, 5, 3, pal.dark);

    // Torso
    line(pose.hip, pose.neck, 7, pal.secondary);
    // tabard stripe
    line([pose.hip[0], pose.hip[1] - 1], [pose.neck[0], pose.neck[1] + 1], 3, pal.primary);
    // belt
    rect(pose.hip[0] - 3, pose.hip[1] - 1, 7, 2, pal.primary);
    // shoulder pads
    rect(pose.neck[0] - 4, pose.neck[1] + 1, 9, 2, pal.primary);

    // Head
    const hx = pose.head[0];
    const hy = pose.head[1];
    rect(hx - 3, hy - 4, 7, 9, pal.primary); // hood
    rect(hx - 3, hy - 1, 7, 2, pal.skin); // eye band
    rect(hx + 1, hy - 1, 2, 2, pal.eyes); // eye (front)
    rect(hx - 2, hy - 1, 1, 2, pal.eyes); // eye (back)
    rect(hx - 3, hy + 1, 7, 4, pal.secondary); // mask
    rect(hx - 2, hy + 2, 5, 1, pal.primary); // mask stripe

    // Front leg
    line(pose.hip, pose.fKnee, 3, pal.secondary);
    line(pose.fKnee, pose.fFoot, 3, pal.primary);
    rect(pose.fFoot[0] - 1, pose.fFoot[1] - 2, 5, 3, pal.secondary);

    // Front arm
    line(shoulder, pose.fElbow, 3, pal.secondary);
    line(pose.fElbow, pose.fHand, 3, pal.primary);
    rect(pose.fHand[0] - 1, pose.fHand[1] - 1, 3, 3, pal.skin);
  }
}

function shiftUpper(p: Pose, dy: number): Pose {
  return {
    ...p,
    hip: [p.hip[0], p.hip[1] + dy],
    neck: [p.neck[0], p.neck[1] + dy],
    head: [p.head[0], p.head[1] + dy],
    fElbow: [p.fElbow[0], p.fElbow[1] + dy],
    fHand: [p.fHand[0], p.fHand[1] + dy],
    bElbow: [p.bElbow[0], p.bElbow[1] + dy],
    bHand: [p.bHand[0], p.bHand[1] + dy],
  };
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * 0.7;
  const g = ((n >> 8) & 255) * 0.7;
  const b = (n & 255) * 0.7;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
