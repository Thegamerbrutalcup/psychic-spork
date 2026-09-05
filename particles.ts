export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  bounce: boolean;
}

export class ParticleSystem {
  particles: Particle[] = [];
  private pool: Particle[] = [];
  groundY = 0;

  private alloc(): Particle {
    return (
      this.pool.pop() ?? {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 1,
        color: "#fff",
        gravity: 0,
        bounce: false,
      }
    );
  }

  emit(opts: {
    x: number;
    y: number;
    count: number;
    colors: string[];
    speed: number;
    dirX?: number;
    dirY?: number;
    spread?: number;
    life?: number;
    size?: number;
    gravity?: number;
    bounce?: boolean;
  }) {
    if (this.particles.length > 600) return;
    const {
      x,
      y,
      count,
      colors,
      speed,
      dirX = 0,
      dirY = 0,
      spread = Math.PI * 2,
      life = 30,
      size = 2,
      gravity = 0.25,
      bounce = false,
    } = opts;
    const baseAngle = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i++) {
      const p = this.alloc();
      const ang = baseAngle + (Math.random() - 0.5) * spread;
      const spd = speed * (0.35 + Math.random() * 0.9);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.maxLife = p.life = life * (0.6 + Math.random() * 0.7);
      p.size = Math.max(1, Math.round(size * (0.5 + Math.random())));
      p.color = colors[(Math.random() * colors.length) | 0];
      p.gravity = gravity;
      p.bounce = bounce;
      this.particles.push(p);
    }
  }

  update() {
    const arr = this.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.bounce && p.y > this.groundY) {
        p.y = this.groundY;
        p.vy *= -0.4;
        p.vx *= 0.7;
      }
      p.life--;
      if (p.life <= 0) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        this.pool.push(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const s = t < 0.3 ? Math.max(1, p.size - 1) : p.size;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
  }

  clear() {
    for (const p of this.particles) this.pool.push(p);
    this.particles.length = 0;
  }
}
