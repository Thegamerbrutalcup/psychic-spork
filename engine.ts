import { AIController, type Projectile } from "./ai";
import { Fighter, emptyCommands, type Commands, type AttackDef, type Box, type HitType } from "./fighter";
import { Input } from "./input";
import { ParticleSystem } from "./particles";
import { ROSTER, STAGES, type StageDef } from "./roster";
import { sfx } from "./sfx";
import { loadScores } from "./highscores";

export type Phase = "menu" | "intro" | "fight" | "ko" | "finish" | "fatality" | "matchwin" | "gameover";

export interface UIState {
  phase: Phase;
  paused: boolean;
  score: number;
  level: number;
  wins: number;
  highScore: number;
  muted: boolean;
  opponent: string;
  stage: string;
}

interface Announce {
  text: string;
  t: number;
  dur: number;
  color: string;
  size: number;
  sub?: string;
}

interface FloatText {
  x: number;
  y: number;
  t: number;
  text: string;
  color: string;
}

interface Spark {
  x: number;
  y: number;
  t: number;
  big: boolean;
}

export const W = 384;
export const H = 216;
const GROUND = 192;
const MIN_X = 18;
const MAX_X = W - 18;
const ROUND_FRAMES = 60 * 60;
const BLOOD = ["#ff2a2a", "#c40f0f", "#ff6a4a", "#8a0000"];
const SPARKS = ["#ffffff", "#ffe27a", "#ffb02e"];
const DUST = ["#6b5a4a", "#8a7a68", "#4a3d33"];

function overlap(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bg: HTMLCanvasElement;
  input: Input;
  p1: Fighter;
  p2: Fighter;
  ai: AIController;
  demoAi: AIController;
  projectiles: Projectile[] = [];
  particles = new ParticleSystem();
  sparks: Spark[] = [];
  floats: FloatText[] = [];
  announce: Announce | null = null;
  comboShow = { hits: 0, t: 0, side: 1 };

  phase: Phase = "menu";
  phaseT = 0;
  paused = false;
  round = 1;
  timer = ROUND_FRAMES;
  score = 0;
  highScore = 0;
  level = 0;
  wins = 0;
  stage: StageDef = STAGES[0];
  p2Visible = true;

  shakeMag = 0;
  shakeX = 0;
  shakeY = 0;
  hitstop = 0;
  slowmo = 0;
  flashScreen = 0;
  flashColor = "#ffffff";
  frame = 0;
  buffer = { punch: 0, kick: 0, special: 0 };

  onUI: ((s: UIState) => void) | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement, input: Input) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.bg = document.createElement("canvas");
    this.bg.width = W + 16;
    this.bg.height = H + 16;
    this.particles.groundY = GROUND;

    this.p1 = new Fighter(ROSTER[0], true);
    this.p2 = new Fighter(ROSTER[1], false);
    this.ai = new AIController(0);
    this.demoAi = new AIController(3);
    for (const f of [this.p1, this.p2]) this.wireFighter(f);
    this.highScore = loadScores()[0]?.score ?? 0;
    this.buildBackground();
    this.setupDemo();
  }

  private wireFighter(f: Fighter) {
    f.onLand = () => {
      this.particles.emit({ x: f.x, y: GROUND, count: 6, colors: DUST, speed: 1.2, dirX: 0, dirY: -1, spread: Math.PI, life: 18, gravity: 0.12 });
      if (f.state === "knockdown" || f.state === "launched" || f.state === "lying") {
        this.addShake(4);
        sfx.knockdown();
        this.particles.emit({ x: f.x, y: GROUND, count: 14, colors: DUST, speed: 2, dirY: -1, spread: Math.PI, life: 24, gravity: 0.15 });
      } else sfx.land();
    };
    f.onJump = () => sfx.jump();
    f.onWhoosh = () => sfx.whoosh();
    f.onFireball = (owner) => this.spawnProjectile(owner);
  }

  // ---------- Lifecycle ----------

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      let dt = now - this.last;
      this.last = now;
      if (dt > 100) dt = 100;
      this.acc += dt;
      const step = 1000 / 60;
      let n = 0;
      while (this.acc >= step && n < 4) {
        this.tick();
        this.acc -= step;
        n++;
      }
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private emitUI() {
    this.onUI?.({
      phase: this.phase,
      paused: this.paused,
      score: this.score,
      level: this.level,
      wins: this.wins,
      highScore: this.highScore,
      muted: sfx.muted,
      opponent: this.p2.def.name,
      stage: this.stage.name,
    });
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.phaseT = 0;
    this.emitUI();
  }

  setupDemo() {
    this.level = 2;
    this.stage = STAGES[0];
    this.buildBackground();
    this.p1.def = ROSTER[0];
    this.p2.def = ROSTER[(Math.random() * (ROSTER.length - 1) + 1) | 0];
    this.p1.damageMul = 1;
    this.p2.damageMul = 1;
    this.p1.resetForRound(W * 0.3, 1);
    this.p2.resetForRound(W * 0.7, -1);
    this.p1.setState("idle");
    this.p2.setState("idle");
    this.p2Visible = true;
    this.projectiles = [];
    this.ai.setLevel(3);
    this.ai.reset();
    this.demoAi.reset();
    this.phase = "menu";
    this.paused = false;
    this.emitUI();
  }

  newGame() {
    sfx.init();
    this.score = 0;
    this.level = 0;
    this.wins = 0;
    this.paused = false;
    this.p1.def = ROSTER[0];
    this.p1.damageMul = 1;
    this.p1.roundsWon = 0;
    this.p2.roundsWon = 0;
    this.setupOpponent();
    this.round = 1;
    this.startRound();
  }

  private setupOpponent() {
    this.p2.def = ROSTER[(this.level % (ROSTER.length - 1)) + 1];
    this.p2.damageMul = 1 + this.level * 0.08;
    this.stage = STAGES[this.level % STAGES.length];
    this.buildBackground();
    this.ai.setLevel(this.level);
    this.p1.roundsWon = 0;
    this.p2.roundsWon = 0;
    this.p2Visible = true;
  }

  private startRound() {
    this.p1.resetForRound(W * 0.32, 1);
    this.p2.resetForRound(W * 0.68, -1);
    this.p2Visible = true;
    this.projectiles = [];
    this.particles.clear();
    this.floats = [];
    this.sparks = [];
    this.timer = ROUND_FRAMES;
    this.ai.reset();
    this.hitstop = 0;
    this.slowmo = 0;
    this.comboShow.t = 0;
    this.setPhase("intro");
    sfx.announce();
    this.setAnnounce(`ROUND ${this.round}`, 62, "#ffd23a", 16, this.round === 1 ? `VS ${this.p2.def.name}` : undefined);
  }

  togglePause() {
    if (this.phase === "menu" || this.phase === "gameover") return;
    this.paused = !this.paused;
    sfx.select();
    this.emitUI();
  }

  quitToMenu() {
    this.setupDemo();
  }

  toggleMute() {
    sfx.init();
    sfx.toggleMute();
    this.emitUI();
  }

  refreshHighScore() {
    this.highScore = loadScores()[0]?.score ?? 0;
    this.emitUI();
  }

  // ---------- Simulation ----------

  private setAnnounce(text: string, dur: number, color: string, size = 16, sub?: string) {
    this.announce = { text, t: 0, dur, color, size, sub };
  }

  addShake(m: number) {
    this.shakeMag = Math.min(14, Math.max(this.shakeMag, m));
  }

  private levelMul() {
    return 1 + this.level * 0.25;
  }

  private addScore(n: number, x?: number, y?: number, color = "#ffe27a") {
    const v = Math.round(n * this.levelMul());
    this.score += v;
    if (this.score > this.highScore) this.highScore = this.score;
    if (x !== undefined && y !== undefined) {
      this.floats.push({ x, y, t: 0, text: `+${v}`, color });
    }
  }

  private playerCommands(): Commands {
    const inp = this.input;
    const cmd = emptyCommands();
    cmd.left = inp.held.left;
    cmd.right = inp.held.right;
    cmd.up = inp.held.up;
    cmd.down = inp.held.down;
    cmd.block = inp.held.block;
    // 8-frame input buffer for attacks so presses during recovery still come out
    for (const k of ["punch", "kick", "special"] as const) {
      if (inp.pressed(k)) this.buffer[k] = 8;
      else if (this.buffer[k] > 0) this.buffer[k]--;
    }
    const f = this.p1;
    const ready = f.canAct || f.state === "jump";
    for (const k of ["punch", "kick", "special"] as const) {
      if (this.buffer[k] > 0 && ready) {
        cmd[k] = true;
        this.buffer[k] = 0;
      }
    }
    return cmd;
  }

  private tick() {
    this.frame++;
    this.input.beginFrame();

    if (this.input.pressed("pause")) {
      this.input.consume("pause");
      if (this.phase === "menu") this.newGame();
      else if (this.phase === "gameover") this.newGame();
      else this.togglePause();
    }
    if (this.paused) return;

    // Always-running cosmetics
    this.particles.update();
    if (this.shakeMag > 0) {
      this.shakeX = (Math.random() * 2 - 1) * this.shakeMag;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeMag * 0.7;
      this.shakeMag *= 0.82;
      if (this.shakeMag < 0.4) this.shakeMag = 0;
    } else {
      this.shakeX = this.shakeY = 0;
    }
    if (this.flashScreen > 0) this.flashScreen--;
    if (this.announce) {
      this.announce.t++;
      if (this.announce.t > this.announce.dur) this.announce = null;
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      if (++this.sparks[i].t > 6) this.sparks.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const ft = this.floats[i];
      ft.t++;
      ft.y -= 0.5;
      if (ft.t > 40) this.floats.splice(i, 1);
    }
    if (this.comboShow.t > 0) this.comboShow.t--;

    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    if (this.slowmo > 0) {
      this.slowmo--;
      if (this.slowmo % 2 === 1) return;
    }

    this.phaseT++;
    this.updatePhase();

    const p1Control = this.phase === "fight" || this.phase === "finish";
    const p2Control = this.phase === "fight";
    const demo = this.phase === "menu";

    let c1: Commands;
    let c2: Commands;
    if (demo) {
      c1 = this.demoAi.think(this.p1, this.p2, this.projectiles);
      c2 = this.ai.think(this.p2, this.p1, this.projectiles);
    } else {
      c1 = this.playerCommands();
      c2 = p2Control ? this.ai.think(this.p2, this.p1, this.projectiles) : emptyCommands();
    }

    const frozen = this.phase === "intro" || this.phase === "matchwin" || this.phase === "gameover";
    if (!frozen) {
      this.p1.update(c1, p1Control || demo, MIN_X, MAX_X);
      this.p2.update(c2, p2Control || demo, MIN_X, MAX_X);
    } else {
      this.p1.animT++;
      this.p2.animT++;
      if (this.p1.flash > 0) this.p1.flash--;
      if (this.p2.flash > 0) this.p2.flash--;
    }

    // Facing
    for (const [a, b] of [
      [this.p1, this.p2],
      [this.p2, this.p1],
    ] as const) {
      if (a.canAct && !a.airborne) a.facing = b.x >= a.x ? 1 : -1;
    }

    // Push apart
    const dx = this.p2.x - this.p1.x;
    const bothGrounded = !this.p1.airborne && !this.p2.airborne;
    if (Math.abs(dx) < 16 && bothGrounded && !this.p1.isDownedOrInvuln && !this.p2.isDownedOrInvuln) {
      const push = (16 - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      this.p1.x -= push * s;
      this.p2.x += push * s;
      this.p1.x = Math.max(MIN_X, Math.min(MAX_X, this.p1.x));
      this.p2.x = Math.max(MIN_X, Math.min(MAX_X, this.p2.x));
    }

    if (!frozen) {
      this.resolveHits(this.p1, this.p2);
      this.resolveHits(this.p2, this.p1);
      this.updateProjectiles();
    }

    if (this.phase === "fight") {
      this.timer--;
      if (this.timer <= 0) this.timeUp();
    }

    if (demo && (this.p1.health <= 0 || this.p2.health <= 0) && this.phaseT > 60) {
      const loser = this.p1.health <= 0 ? this.p1 : this.p2;
      if (loser.state === "lying" && loser.timer > 20) {
        this.p1.resetForRound(W * 0.3, 1);
        this.p2.resetForRound(W * 0.7, -1);
        this.p1.setState("idle");
        this.p2.setState("idle");
        this.projectiles = [];
        this.phaseT = 0;
      }
    }
  }

  private updatePhase() {
    switch (this.phase) {
      case "intro":
        if (this.phaseT === 66) {
          this.setAnnounce("FIGHT!", 40, "#ff3b3b", 20);
          sfx.fight();
        }
        if (this.phaseT >= 70) {
          this.p1.setState("idle");
          this.p2.setState("idle");
          this.setPhase("fight");
        }
        break;
      case "ko":
        if (this.phaseT === 40) {
          const winner = this.p1.health > this.p2.health ? this.p1 : this.p2;
          if (!winner.airborne && winner.health > 0) winner.setState("win");
        }
        if (this.phaseT >= 110) this.endRound();
        break;
      case "finish":
        if (this.phaseT >= 240) {
          // Time's up: opponent just collapses
          this.p2.applyHit("knockdown", 0, 1, 0, this.p2.facing === 1 ? -1 : 1);
          this.setAnnounce("K.O.", 60, "#ff3b3b", 20);
          this.setPhase("ko");
        }
        break;
      case "fatality":
        if (this.phaseT === 30) this.p1.setState("win");
        if (this.phaseT >= 150) this.endRound();
        break;
      case "matchwin":
        if (this.phaseT >= 150) {
          this.level++;
          this.wins++;
          this.setupOpponent();
          this.round = 1;
          this.startRound();
        }
        break;
      default:
        break;
    }
  }

  private timeUp() {
    const p1Wins = this.p1.health >= this.p2.health;
    const loser = p1Wins ? this.p2 : this.p1;
    loser.health = Math.min(loser.health, 0);
    loser.applyHit("knockdown", 0, 1.5, 0, loser.facing === 1 ? -1 : 1);
    this.setAnnounce("TIME UP", 70, "#ffd23a", 16);
    sfx.ko();
    this.setPhase("ko");
  }

  private onKO(victim: Fighter, dir: 1 | -1) {
    if (this.phase !== "fight") return;
    this.slowmo = 46;
    this.addShake(9);
    this.flashScreen = 10;
    this.flashColor = "#ff2a2a";
    sfx.ko();
    const winner = victim === this.p1 ? this.p2 : this.p1;
    const matchPoint = winner.roundsWon + 1 >= 2;
    if (victim === this.p2 && matchPoint) {
      // FINISH HIM
      victim.setState("dizzy");
      victim.y = 0;
      victim.vy = 0;
      victim.vx = dir * 3;
      this.setAnnounce("FINISH HIM!", 240, "#ff3b3b", 16, "ANY HIT = FATALITY");
      this.setPhase("finish");
    } else {
      this.setAnnounce("K.O.", 70, "#ff3b3b", 22);
      this.setPhase("ko");
    }
  }

  private fatality(hitX: number, hitY: number) {
    this.setPhase("fatality");
    this.p2Visible = false;
    this.p2.setState("dead");
    this.hitstop = 12;
    this.addShake(14);
    this.flashScreen = 18;
    this.flashColor = "#ffffff";
    sfx.fatality();
    const pal = this.p2.def.palette;
    const px = this.p2.x;
    const py = GROUND - 24;
    this.particles.emit({ x: px, y: py, count: 90, colors: BLOOD, speed: 5, spread: Math.PI * 2, life: 70, size: 3, gravity: 0.22, bounce: true });
    this.particles.emit({ x: px, y: py, count: 40, colors: [pal.primary, pal.secondary, pal.skin, pal.dark], speed: 4, spread: Math.PI * 2, life: 90, size: 4, gravity: 0.25, bounce: true });
    this.particles.emit({ x: hitX, y: hitY, count: 30, colors: SPARKS, speed: 6, spread: Math.PI * 2, life: 30, size: 2, gravity: 0.05 });
    this.setAnnounce("FATALITY", 150, "#ff1f1f", 22, "+1500 BONUS");
    this.addScore(1500, px, py - 20, "#ff6a6a");
  }

  private endRound() {
    const p1Won = this.p1.health > 0 && (this.p2.health <= 0 || this.p1.health >= this.p2.health);
    const winner = p1Won ? this.p1 : this.p2;
    winner.roundsWon++;
    if (p1Won) {
      const timeBonus = Math.ceil(this.timer / 60) * 5;
      const healthBonus = Math.round(this.p1.health) * 10;
      this.addScore(500 + timeBonus + healthBonus);
      if (!this.p1.tookDamageThisRound) {
        this.addScore(1000);
      }
      sfx.score();
    }
    if (winner.roundsWon >= 2) {
      if (p1Won) {
        const flawless = !this.p1.tookDamageThisRound;
        this.setAnnounce(flawless ? "FLAWLESS VICTORY" : "YOU WIN", 150, "#ffd23a", flawless ? 12 : 20, `TOWER ${this.level + 2} NEXT`);
        this.setPhase("matchwin");
      } else {
        this.setAnnounce("YOU LOSE", 999, "#ff3b3b", 20);
        sfx.gameOver();
        this.setPhase("gameover");
      }
    } else {
      this.round++;
      this.startRound();
    }
  }

  private spawnProjectile(owner: Fighter) {
    sfx.fireball();
    this.projectiles.push({
      x: owner.x + owner.facing * 16,
      y: GROUND - 34,
      vx: owner.facing * 3.6,
      owner,
      life: 200,
      colors: owner.def.projectile,
      dead: false,
      damage: 10,
    });
    this.particles.emit({ x: owner.x + owner.facing * 16, y: GROUND - 34, count: 10, colors: owner.def.projectile, speed: 2, dirX: owner.facing, spread: 1.2, life: 15, gravity: 0 });
  }

  private updateProjectiles() {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.x += p.vx;
      p.life--;
      if (this.frame % 2 === 0) {
        this.particles.emit({ x: p.x, y: p.y, count: 1, colors: p.colors, speed: 0.6, dirX: -Math.sign(p.vx), spread: 1.5, life: 14, gravity: -0.02, size: 2 });
      }
      if (p.x < -20 || p.x > W + 20 || p.life <= 0) p.dead = true;
      const foe = p.owner === this.p1 ? this.p2 : this.p1;
      const hb = foe.hurtbox();
      const box: Box = { x: p.x - 5, y: p.y - GROUND - 4, w: 10, h: 8 };
      if (hb && overlap(box, hb)) {
        p.dead = true;
        const dir: 1 | -1 = p.vx > 0 ? 1 : -1;
        this.applyStrike(p.owner, foe, { type: "knockdown", damage: p.damage, knockback: 4, hitstun: 20, score: 150, heavy: true, kind: "special" }, p.x, p.y, dir);
        this.particles.emit({ x: p.x, y: p.y, count: 18, colors: p.colors, speed: 3, spread: Math.PI * 2, life: 24, gravity: 0.05 });
      }
      // Projectile clash
      for (const q of this.projectiles) {
        if (q !== p && !q.dead && q.owner !== p.owner && Math.abs(q.x - p.x) < 10) {
          p.dead = q.dead = true;
          this.particles.emit({ x: (p.x + q.x) / 2, y: p.y, count: 30, colors: [...p.colors, ...q.colors], speed: 3.5, spread: Math.PI * 2, life: 30, gravity: 0.05 });
          this.addShake(3);
          sfx.block();
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private resolveHits(attacker: Fighter, victim: Fighter) {
    const hb = attacker.activeHitbox();
    if (!hb) return;
    const vb = victim.hurtbox();
    if (!vb || !overlap(hb, vb)) return;
    attacker.attackLanded = true;
    const a = attacker.attack as AttackDef;
    const ix = Math.max(hb.x, vb.x);
    const iw = Math.min(hb.x + hb.w, vb.x + vb.w) - ix;
    const iy = Math.max(hb.y, vb.y);
    const ih = Math.min(hb.y + hb.h, vb.y + vb.h) - iy;
    const hx = ix + iw / 2;
    const hy = GROUND + iy + ih / 2;
    this.applyStrike(attacker, victim, a, hx, hy, attacker.facing);
  }

  private applyStrike(
    attacker: Fighter,
    victim: Fighter,
    a: { type: HitType; damage: number; knockback: number; hitstun: number; score: number; heavy: boolean; kind: string },
    hx: number,
    hy: number,
    dir: 1 | -1
  ) {
    if (this.phase === "finish" && victim === this.p2) {
      this.fatality(hx, hy);
      return;
    }
    if (this.phase !== "fight" && this.phase !== "menu") return;

    if (victim.blocks(a.type)) {
      const chip = a.kind === "punch" ? 0 : a.kind === "special" ? 2 : 1;
      victim.applyBlock(chip, a.knockback * 0.9, dir);
      if (!victim.airborne) attacker.x -= dir * 1.5;
      this.particles.emit({ x: hx, y: hy, count: 8, colors: SPARKS, speed: 2.5, dirX: dir, spread: 2.2, life: 16, gravity: 0.1 });
      this.sparks.push({ x: hx, y: hy, t: 0, big: false });
      this.hitstop = 2;
      this.addShake(1.5);
      sfx.block();
      if (attacker.isPlayer) this.floats.push({ x: hx, y: hy - 6, t: 0, text: "BLOCK", color: "#9ad0ff" });
      return;
    }

    const wasInCombo = victim.inHitState || victim.airborne;
    const dmg = Math.round(a.damage * attacker.damageMul);
    victim.applyHit(a.type, dmg, a.knockback, a.hitstun, dir);
    attacker.comboHits = wasInCombo ? attacker.comboHits + 1 : 1;
    attacker.comboTimer = 70;

    const heavy = a.heavy;
    this.hitstop = heavy ? 7 : 4;
    this.addShake(heavy ? 6 : 3);
    sfx.hit(heavy);
    this.sparks.push({ x: hx, y: hy, t: 0, big: heavy });
    this.particles.emit({
      x: hx,
      y: hy,
      count: heavy ? 26 : 12,
      colors: BLOOD,
      speed: heavy ? 4 : 2.6,
      dirX: dir,
      dirY: heavy ? -0.8 : -0.3,
      spread: 1.6,
      life: 40,
      size: 2,
      gravity: 0.25,
      bounce: true,
    });

    if (attacker.isPlayer && this.phase === "fight") {
      const mul = 1 + (attacker.comboHits - 1) * 0.5;
      this.addScore(a.score * mul, hx, hy - 10);
      if (attacker.comboHits >= 2) {
        this.comboShow = { hits: attacker.comboHits, t: 70, side: attacker.x < W / 2 ? 1 : -1 };
        sfx.score();
      }
    }

    if (victim.health <= 0) this.onKO(victim, dir);
  }

  // ---------- Rendering ----------

  private buildBackground() {
    const c = this.bg.getContext("2d")!;
    const s = this.stage;
    const bw = this.bg.width;
    const bh = this.bg.height;
    const g = c.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, s.sky[0]);
    g.addColorStop(1, s.sky[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, bw, bh);

    // Stars
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    c.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) c.fillRect((rnd() * bw) | 0, (rnd() * 120) | 0, 1, 1);

    // Moon
    c.fillStyle = s.moon;
    const mx = 236;
    const my = 84;
    for (let y = -14; y <= 14; y++) {
      const w = Math.round(Math.sqrt(14 * 14 - y * y));
      c.fillRect(mx - w, my + y, w * 2, 1);
    }
    c.fillStyle = s.sky[0];
    c.globalAlpha = 0.35;
    c.fillRect(mx - 6, my - 4, 4, 3);
    c.fillRect(mx + 3, my + 5, 5, 4);
    c.globalAlpha = 1;

    // Far pagodas/mountains
    c.fillStyle = s.far;
    for (let i = 0; i < 9; i++) {
      const x = i * 48 + ((rnd() * 20) | 0);
      const hgt = 40 + ((rnd() * 40) | 0);
      c.fillRect(x, 168 - hgt, 34, hgt + 40);
      c.fillRect(x - 6, 168 - hgt + 8, 46, 3);
      c.fillRect(x - 3, 168 - hgt + 22, 40, 3);
      c.fillRect(x + 15, 168 - hgt - 8, 4, 8);
    }
    // Mid pillars with spikes
    c.fillStyle = s.mid;
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 72;
      c.fillRect(x, 120, 14, 88);
      c.fillRect(x - 4, 116, 22, 5);
      c.fillRect(x + 5, 106, 4, 10);
    }
    // Torches (static base; flame drawn live)
    // Floor
    c.fillStyle = s.floor;
    c.fillRect(0, GROUND + 8, bw, bh - GROUND - 8);
    c.fillStyle = s.floorLine;
    c.fillRect(0, GROUND + 8, bw, 2);
    for (let x = 0; x < bw; x += 24) {
      c.fillRect(x + ((rnd() * 4) | 0), GROUND + 12, 12, 1);
      c.fillRect(x + 10, GROUND + 18, 8, 1);
    }
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.fillRect(0, GROUND + 8, bw, 3);
    // Ledge
    c.fillStyle = s.mid;
    c.fillRect(0, GROUND + 4, bw, 5);
    c.fillStyle = s.accent;
    c.globalAlpha = 0.4;
    for (let x = 4; x < bw; x += 16) c.fillRect(x, GROUND + 5, 6, 1);
    c.globalAlpha = 1;
  }

  private render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.shakeX), Math.round(this.shakeY));
    ctx.drawImage(this.bg, -8, -8);

    // Live torch flames on pillars
    const s = this.stage;
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 72 - 8 + 7;
      const fl = (Math.sin(this.frame * 0.4 + i) + 1) * 1.5;
      ctx.fillStyle = s.accent;
      ctx.fillRect(x - 1, 98 - fl, 4, 4 + fl);
      ctx.fillStyle = "#fff6c0";
      ctx.fillRect(x, 100, 2, 2);
    }

    // Projectiles (behind fighters slightly)
    for (const p of this.projectiles) {
      const r = 3 + Math.sin(this.frame * 0.8) * 1;
      ctx.fillStyle = p.colors[2];
      ctx.fillRect(Math.round(p.x - r - 1), Math.round(p.y - r + 1), r * 2 + 2, r * 2 - 2);
      ctx.fillStyle = p.colors[1];
      ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
      ctx.fillStyle = p.colors[0];
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 3, 3);
    }

    // Fighters: draw the one lower in the air / attacking on top
    const order = this.p1.airborne && !this.p2.airborne ? [this.p2, this.p1] : [this.p1, this.p2];
    for (const f of order) {
      if (f === this.p2 && !this.p2Visible) continue;
      f.draw(ctx, GROUND);
    }

    this.particles.draw(ctx);

    // Hit sparks
    for (const sp of this.sparks) {
      const r = (sp.big ? 9 : 6) - sp.t;
      if (r <= 0) continue;
      ctx.fillStyle = sp.t < 2 ? "#ffffff" : "#ffe27a";
      ctx.fillRect(Math.round(sp.x - r), Math.round(sp.y - 1), r * 2, 2);
      ctx.fillRect(Math.round(sp.x - 1), Math.round(sp.y - r), 2, r * 2);
      const d = Math.round(r * 0.6);
      ctx.fillRect(Math.round(sp.x - d), Math.round(sp.y - d), 2, 2);
      ctx.fillRect(Math.round(sp.x + d - 1), Math.round(sp.y + d - 1), 2, 2);
      ctx.fillRect(Math.round(sp.x - d), Math.round(sp.y + d - 1), 2, 2);
      ctx.fillRect(Math.round(sp.x + d - 1), Math.round(sp.y - d), 2, 2);
    }

    ctx.restore();

    // Vignette bottom
    if (this.flashScreen > 0) {
      ctx.globalAlpha = Math.min(0.7, this.flashScreen / 14);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    this.drawHUD(ctx);
  }

  private text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", outline = true) {
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    if (outline) {
      ctx.fillStyle = "#000";
      ctx.fillText(str, x + 1, y + 1);
      ctx.fillText(str, x - 1, y + 1);
      ctx.fillText(str, x + 1, y - 1);
      ctx.fillText(str, x - 1, y - 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, f: Fighter, left: boolean) {
    const bw = 150;
    const bh = 9;
    const x = left ? 10 : W - 10 - bw;
    const y = 10;
    ctx.fillStyle = "#000";
    ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = "#3a0a0a";
    ctx.fillRect(x, y, bw, bh);
    const dw = Math.round((f.displayHealth / f.maxHealth) * bw);
    const hw = Math.round((f.health / f.maxHealth) * bw);
    const hx = left ? x : x + bw - dw;
    ctx.fillStyle = "#ff5a3a";
    ctx.fillRect(hx, y, dw, bh);
    const hx2 = left ? x : x + bw - hw;
    const low = f.health < 25;
    ctx.fillStyle = low && this.frame % 20 < 10 ? "#ffd23a" : "#4ff05a";
    ctx.fillRect(hx2, y, hw, bh);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(hx2, y, hw, 2);
    // Name
    this.text(ctx, f.def.name, left ? x + 2 : x + bw - 2, y + 12, 8, "#ffffff", left ? "left" : "right");
    // Round wins
    for (let i = 0; i < 2; i++) {
      const wx = left ? x + 2 + i * 8 : x + bw - 7 - i * 8;
      ctx.fillStyle = i < f.roundsWon ? "#ffd23a" : "#222";
      ctx.fillRect(wx, y + 23, 5, 5);
      ctx.fillStyle = "#000";
      ctx.fillRect(wx, y + 28, 5, 1);
    }
    // Special meter
    const mw = 60;
    const mx = left ? x + 22 : x + bw - 22 - mw;
    const ready = f.specialCd <= 0;
    const fill = Math.round(((110 - f.specialCd) / 110) * mw);
    ctx.fillStyle = "#000";
    ctx.fillRect(mx - 1, y + 22, mw + 2, 6);
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(mx, y + 23, mw, 4);
    ctx.fillStyle = ready ? (this.frame % 30 < 15 ? "#9ad0ff" : "#ffffff") : "#3a7ad0";
    ctx.fillRect(left ? mx : mx + mw - fill, y + 23, fill, 4);
  }

  private drawHUD(ctx: CanvasRenderingContext2D) {
    if (this.phase === "menu") return;
    this.drawHealthBar(ctx, this.p1, true);
    this.drawHealthBar(ctx, this.p2, false);

    // Timer
    const secs = Math.max(0, Math.ceil(this.timer / 60));
    ctx.fillStyle = "#000";
    ctx.fillRect(W / 2 - 20, 6, 40, 22);
    ctx.fillStyle = "#1c1c24";
    ctx.fillRect(W / 2 - 19, 7, 38, 20);
    this.text(ctx, String(secs).padStart(2, "0"), W / 2, 10, 16, secs <= 10 && this.frame % 20 < 10 ? "#ff3b3b" : "#ffd23a", "center");

    // Score
    this.text(ctx, `SCORE ${String(this.score).padStart(7, "0")}`, 10, 40, 8, "#ffe27a");
    this.text(ctx, `HI ${String(this.highScore).padStart(7, "0")}`, W - 10, 40, 8, "#c0c0d0", "right");
    this.text(ctx, `TOWER ${this.level + 1}`, W / 2, 30, 8, "#c0c0d0", "center");

    // Combo
    if (this.comboShow.t > 0 && this.comboShow.hits >= 2) {
      const t = 70 - this.comboShow.t;
      const size = t < 4 ? 14 : 10;
      const x = this.comboShow.side === 1 ? 14 : W - 14;
      const align: CanvasTextAlign = this.comboShow.side === 1 ? "left" : "right";
      const col = this.comboShow.hits >= 4 ? "#ff3b3b" : "#ffd23a";
      this.text(ctx, `${this.comboShow.hits} HITS`, x, 56, size, col, align);
    }

    // Float texts
    for (const ft of this.floats) {
      if (ft.t > 30 && ft.t % 2 === 0) continue;
      this.text(ctx, ft.text, Math.round(ft.x), Math.round(ft.y), 8, ft.color, "center");
    }

    // Announcement
    if (this.announce) {
      const a = this.announce;
      const t = a.t;
      let size = a.size;
      if (t < 6) size = a.size + (6 - t) * 3;
      const fadeOut = a.dur - t < 10 && a.dur < 900 ? (a.dur - t) % 2 === 0 : true;
      if (fadeOut) {
        const wob = a.text === "FINISH HIM!" ? Math.sin(this.frame * 0.3) * 2 : 0;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 84, W, size + 14 + (a.sub ? 14 : 0));
        this.text(ctx, a.text, W / 2 + wob, 90, size, a.color, "center");
        if (a.sub) this.text(ctx, a.sub, W / 2, 92 + size + 4, 8, "#ffffff", "center");
      }
    }
  }
}
