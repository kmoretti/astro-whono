// 星光/流星背景 —— 效果对齐 https://illusion.azxt.org/ 的 Canvas 粒子特效：
// 夜间（data-theme="dark"）：光谱星光（径向辉光 + 十字光芒 + 深度闪烁）+ 萤火虫 + 流星（偶发流星群）
// 白天（其他主题）：彩带 / 糖果 / 爱心 / 星星组成的糖果雨（景深视差 + 摆动 + 旋转）
// 适配：明暗模式实时切换、窗口尺寸变化（DPR 上限 2）、低性能设备粒子减半、
// 30fps 帧率上限（按 60fps 基准归一化运动节奏）、页面不可见暂停、
// 阅读模式（body[data-reading="immersive"]）暂停、body[data-starry-enabled] 开关实时生效。

interface StarParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
  hasRays: boolean;
  rayLength: number;
}

interface FireflyParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  glowSize: number;
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
  wanderAngle: number;
}

type FallingKind = 'ribbon' | 'candy' | 'heart' | 'dayStar';

interface FallingParticle {
  kind: FallingKind;
  x: number;
  y: number;
  speed: number;
  color: string;
  stripeColor: string;
  size: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  depth: number;
  candyType: number;
  points: number;
  pulse: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  decay: number;
  width: number;
}

type Mode = 'night' | 'day';

interface SpectralType {
  minSize: number;
  maxSize: number;
  colors: string[];
  weight: number;
}

// 光谱型星光：按权重分布（小星多、大星少），色温从蓝白到暖橙
const STAR_SPECTRAL_TYPES: SpectralType[] = [
  { minSize: 2.5, maxSize: 4, colors: ['#FFFFFF', '#E8F0FF', '#D0E0FF'], weight: 1 },
  { minSize: 1.5, maxSize: 3, colors: ['#FFF8F0', '#FFF0D0', '#FFE8C0'], weight: 3 },
  { minSize: 0.8, maxSize: 1.8, colors: ['#FFD8B0', '#FFC090', '#FFA870'], weight: 4 }
];

const FIREFLY_COLORS = ['#60FF80', '#50FF70', '#70FF90', '#40FF60', '#80FFA0'];

const DAY_COLORS = [
  '#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7',
  '#9775FA', '#F783AC', '#FF8787', '#FFC078', '#FCC419'
];
const DAY_CANDY_COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC'];
const DAY_HEART_COLORS = ['#FF6B6B', '#F783AC', '#FFA94D', '#FF8787', '#9775FA', '#4DABF7'];
const DAY_STAR_COLORS = ['#FFD43B', '#FFA94D', '#FF6B6B', '#69DB7C', '#4DABF7', '#F783AC'];

const COUNTS = {
  nightStar: 80,
  firefly: 35,
  ribbon: 35,
  candy: 22,
  heart: 10,
  dayStar: 15
} as const;

// 流星：2~12s 随机间隔；约 30% 概率出现 2-4 颗的流星群
const SHOOTING_MIN_INTERVAL_MS = 2000;
const SHOOTING_RANDOM_MS = 10000;
const SHOOTING_GROUP_THRESHOLD = 0.7;

const LOW_END_RATIO = 0.5;
const FIREFLY_MAX_SPEED = 1.2;
const MAX_FPS = 30;
const FRAME_INTERVAL = 1000 / MAX_FPS;
const REFERENCE_FRAME_MS = 1000 / 60;

const detectLowEndDevice = () => {
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  return lowCores || lowMemory || mobile;
};

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;

const scaledCount = (base: number, lowEnd: boolean) =>
  Math.max(0, Math.floor(lowEnd ? base * LOW_END_RATIO : base));

class StarryBackground {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stars: StarParticle[] = [];
  private fireflies: FireflyParticle[] = [];
  private falling: FallingParticle[] = [];
  private shootingStars: ShootingStar[] = [];
  private mode: Mode = 'night';
  private rafId: number | null = null;
  private lastTime = 0;
  private lastShootingAt = 0;
  private resizeTimer: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private modeObserver: MutationObserver | null = null;
  private readingHandler: (() => void) | null = null;
  private reducedMotion = false;
  private pausedByReading = false;
  private isRunning = false;
  private lowEnd = false;
  private w = 0;
  private h = 0;

  init(): void {
    if (this.isRunning) return;
    this.canvas = document.querySelector<HTMLCanvasElement>('[data-starry-bg]');
    if (!this.canvas) return;
    if (!isEnabledOnBody()) return;
    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    this.ctx = ctx;
    this.lowEnd = detectLowEndDevice();
    this.reducedMotion = prefersReducedMotion();
    this.resize();
    this.bindEvents();
    this.isRunning = true;
    this.detectMode();
  }

  destroy(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    window.removeEventListener('resize', this.onResize);
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.modeObserver) this.modeObserver.disconnect();
    if (this.readingHandler) {
      window.removeEventListener('astro-whono:reading-mode-change', this.readingHandler);
    }
    this.stars = [];
    this.fireflies = [];
    this.falling = [];
    this.shootingStars = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.canvas.style.display = '';
    }
  }

  pause(): void {
    if (!this.isRunning) return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.canvas) this.canvas.style.display = 'none';
  }

  resume(): void {
    if (!this.isRunning) return;
    if (this.canvas) this.canvas.style.display = '';
    if (this.reducedMotion) {
      this.drawFrame();
      return;
    }
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((time) => this.tick(time));
  }

  getMode(): Mode {
    return this.mode;
  }

  isActive(): boolean {
    return this.isRunning && !this.pausedByReading;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pause();
      } else if (!this.pausedByReading) {
        this.resume();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.modeObserver = new MutationObserver(() => this.detectMode());
    this.modeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    this.readingHandler = () => {
      const reading = document.body.dataset.reading === 'immersive';
      this.pausedByReading = reading;
      if (reading) {
        this.pause();
      } else if (!document.hidden) {
        this.resume();
      }
    };
    window.addEventListener('astro-whono:reading-mode-change', this.readingHandler);
  }

  private onResize = (): void => {
    if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 100);
  };

  private detectMode(): void {
    const theme = document.documentElement.getAttribute('data-theme');
    const next: Mode = theme === 'dark' ? 'night' : 'day';
    if (next !== this.mode || !this.isPopulated()) {
      this.switchMode(next);
    }
  }

  private isPopulated(): boolean {
    return this.stars.length > 0 || this.falling.length > 0;
  }

  private switchMode(mode: Mode): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.mode = mode;
    this.stars = [];
    this.fireflies = [];
    this.falling = [];
    this.shootingStars = [];
    if (mode === 'night') {
      this.spawnNightParticles();
    } else {
      this.spawnDayParticles();
    }
    this.lastShootingAt = 0;
    this.lastTime = performance.now();
    if (this.reducedMotion) {
      this.drawFrame();
      return;
    }
    this.tick(this.lastTime);
  }

  private resize(): void {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  private spawnNightParticles(): void {
    const starCount = scaledCount(COUNTS.nightStar, this.lowEnd);
    for (let i = 0; i < starCount; i++) {
      this.stars.push(this.createStar());
    }
    const fireflyCount = scaledCount(COUNTS.firefly, this.lowEnd);
    for (let i = 0; i < fireflyCount; i++) {
      this.fireflies.push(this.createFirefly());
    }
  }

  private createStar(): StarParticle {
    const totalWeight = STAR_SPECTRAL_TYPES.reduce((sum, type) => sum + type.weight, 0);
    let roll = Math.random() * totalWeight;
    let spectral = STAR_SPECTRAL_TYPES[0] as SpectralType;
    for (const type of STAR_SPECTRAL_TYPES) {
      roll -= type.weight;
      if (roll <= 0) {
        spectral = type;
        break;
      }
    }
    const size = spectral.minSize + Math.random() * (spectral.maxSize - spectral.minSize);
    const isBright = size > 2.5;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h * 0.85,
      size,
      color: pick(spectral.colors),
      twinkle: Math.random() * Math.PI * 2,
      // 亮星闪烁慢而沉稳，暗星闪烁快而细碎
      twinkleSpeed: isBright ? 0.008 + Math.random() * 0.015 : 0.02 + Math.random() * 0.06,
      hasRays: size > 2 && Math.random() > 0.4,
      rayLength: 2 + size * 1.5 + Math.random() * 3
    };
  }

  private createFirefly(): FireflyParticle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.8;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      size: 1 + Math.random(),
      color: pick(FIREFLY_COLORS),
      glowSize: 5 + Math.random() * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.03 + Math.random() * 0.05,
      wanderAngle: Math.random() * Math.PI * 2
    };
  }

  private spawnDayParticles(): void {
    const kinds: Array<[FallingKind, number]> = [
      ['ribbon', scaledCount(COUNTS.ribbon, this.lowEnd)],
      ['candy', scaledCount(COUNTS.candy, this.lowEnd)],
      ['heart', scaledCount(COUNTS.heart, this.lowEnd)],
      ['dayStar', scaledCount(COUNTS.dayStar, this.lowEnd)]
    ];
    for (const [kind, count] of kinds) {
      for (let i = 0; i < count; i++) {
        this.falling.push(this.createFalling(kind));
      }
    }
  }

  private createFalling(kind: FallingKind): FallingParticle {
    const depth = Math.random();
    const base: FallingParticle = {
      kind,
      x: Math.random() * this.w,
      // 初始纵向铺满 -h ~ h，让糖果雨开场即处于进行中
      y: Math.random() * this.h * 2 - this.h,
      speed: 0.5,
      color: pick(DAY_COLORS),
      stripeColor: pick(DAY_CANDY_COLORS),
      size: 8,
      width: 4 + Math.random() * 6,
      height: 25 + Math.random() * 35,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02,
      depth,
      candyType: Math.floor(Math.random() * 3),
      points: 4 + Math.floor(Math.random() * 2),
      pulse: Math.random() * Math.PI * 2
    };
    if (kind === 'ribbon') {
      base.speed = 0.6 + depth * 1.5;
      base.rotationSpeed = (Math.random() - 0.5) * 0.06;
      base.wobbleSpeed = 0.02 + Math.random() * 0.03;
    } else if (kind === 'candy') {
      base.speed = 0.5 + depth * 1.2;
      base.size = 8 + Math.random() * 12;
      base.rotationSpeed = (Math.random() - 0.5) * 0.05;
      base.wobbleSpeed = 0.015 + Math.random() * 0.02;
    } else if (kind === 'heart') {
      base.speed = 0.4 + depth * 0.8;
      base.color = pick(DAY_HEART_COLORS);
      base.size = 6 + Math.random() * 10;
      base.rotation = (Math.random() - 0.5) * 0.3;
      base.wobbleSpeed = 0.02 + Math.random() * 0.02;
    } else {
      base.speed = 0.3 + depth * 0.7;
      base.color = pick(DAY_STAR_COLORS);
      base.size = 5 + Math.random() * 8;
      base.rotationSpeed = (Math.random() - 0.5) * 0.04;
      base.wobbleSpeed = 0.01 + Math.random() * 0.02;
    }
    return base;
  }

  private createShootingStar(): ShootingStar {
    const angle = Math.PI / 3 + (Math.random() - 0.5) * 0.8;
    const speed = 6 + Math.random() * 12;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h * 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 50 + Math.random() * 100,
      life: 1,
      decay: 0.008 + Math.random() * 0.015,
      width: 1 + Math.random() * 1.5
    };
  }

  private tick(time: number): void {
    if (!this.isRunning) return;
    const delta = time - this.lastTime;
    if (delta < FRAME_INTERVAL) {
      this.rafId = requestAnimationFrame((next) => this.tick(next));
      return;
    }
    this.lastTime = time - (delta % FRAME_INTERVAL);
    // 帧率上限 30fps，但运动增量按 60fps 基准归一化，保持参考站的节奏
    const step = delta / REFERENCE_FRAME_MS;
    this.update(step);
    this.drawFrame();
    this.rafId = requestAnimationFrame((next) => this.tick(next));
  }

  private update(step: number): void {
    for (const star of this.stars) {
      star.twinkle += star.twinkleSpeed * step;
    }

    for (const fly of this.fireflies) {
      fly.phase += fly.phaseSpeed * step;
      fly.wanderAngle += (Math.random() - 0.5) * 0.15 * step;
      fly.vx += Math.cos(fly.wanderAngle) * 0.03 * step;
      fly.vy += Math.sin(fly.wanderAngle) * 0.03 * step;
      const speed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy);
      if (speed > FIREFLY_MAX_SPEED) {
        fly.vx = (fly.vx / speed) * FIREFLY_MAX_SPEED;
        fly.vy = (fly.vy / speed) * FIREFLY_MAX_SPEED;
      }
      fly.x += fly.vx * step;
      fly.y += fly.vy * step;
      // 越界环绕
      if (fly.x < -fly.glowSize) fly.x = this.w + fly.glowSize;
      if (fly.x > this.w + fly.glowSize) fly.x = -fly.glowSize;
      if (fly.y < -fly.glowSize) fly.y = this.h + fly.glowSize;
      if (fly.y > this.h + fly.glowSize) fly.y = -fly.glowSize;
    }

    if (this.mode === 'day') {
      for (const p of this.falling) {
        const depthSpeed = 0.4 + p.depth * 0.6;
        p.y += p.speed * depthSpeed * step;
        p.wobble += p.wobbleSpeed * step;
        p.x += Math.sin(p.wobble) * 0.8 * step;
        p.rotation += p.rotationSpeed * step;
        p.pulse += 0.05 * step;
        if (p.y > this.h + 50) {
          p.y = -50;
          p.x = Math.random() * this.w;
        }
      }
      return;
    }

    this.updateShootingStars(step);
  }

  private updateShootingStars(step: number): void {
    const now = timeNow();
    const interval = SHOOTING_MIN_INTERVAL_MS + Math.random() * SHOOTING_RANDOM_MS;
    if (now - this.lastShootingAt > interval) {
      const count = Math.random() > SHOOTING_GROUP_THRESHOLD
        ? 2 + Math.floor(Math.random() * 3)
        : 1;
      for (let i = 0; i < count; i++) {
        const star = this.createShootingStar();
        if (i > 0) {
          star.x += (Math.random() - 0.5) * 200;
          star.y += (Math.random() - 0.5) * 100;
        }
        this.shootingStars.push(star);
      }
      this.lastShootingAt = now;
    }
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i] as ShootingStar | undefined;
      if (!star) continue;
      star.x += star.vx * step;
      star.y += star.vy * step;
      star.life -= star.decay * step;
      if (star.life <= 0 || star.x > this.w + 100 || star.y > this.h + 100) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  private drawFrame(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const star of this.stars) {
      this.drawStar(ctx, star);
    }
    for (const fly of this.fireflies) {
      this.drawFirefly(ctx, fly);
    }
    for (const p of this.falling) {
      this.drawFalling(ctx, p);
    }
    for (const star of this.shootingStars) {
      this.drawShootingStar(ctx, star);
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, star: StarParticle): void {
    const twinkleValue = Math.sin(star.twinkle);
    const alpha = 0.15 + (twinkleValue * 0.5 + 0.5) * 0.85;
    const sizeMultiplier = 0.6 + (twinkleValue * 0.5 + 0.5) * 0.6;
    const currentSize = star.size * sizeMultiplier;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 径向辉光
    const glowSize = currentSize * (3 + twinkleValue * 2);
    const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize);
    glow.addColorStop(0, star.color);
    glow.addColorStop(0.2, `${star.color}C0`);
    glow.addColorStop(0.5, `${star.color}50`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(star.x, star.y, glowSize, 0, Math.PI * 2);
    ctx.fill();
    // 白色星核
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(star.x, star.y, currentSize, 0, Math.PI * 2);
    ctx.fill();
    // 大星十字光芒
    if (star.hasRays) {
      const rayLen = star.rayLength * currentSize * (0.7 + twinkleValue * 0.5);
      ctx.strokeStyle = star.color;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(star.x - rayLen, star.y);
      ctx.lineTo(star.x + rayLen, star.y);
      ctx.moveTo(star.x, star.y - rayLen);
      ctx.lineTo(star.x, star.y + rayLen);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFirefly(ctx: CanvasRenderingContext2D, fly: FireflyParticle): void {
    const glow = 0.3 + Math.sin(fly.phase) * 0.5 + 0.2;
    ctx.save();
    const glowRadius = fly.size * 2.5;
    const gradient = ctx.createRadialGradient(fly.x, fly.y, 0, fly.x, fly.y, glowRadius);
    gradient.addColorStop(0, fly.color);
    gradient.addColorStop(0.3, `${fly.color}B0`);
    gradient.addColorStop(1, 'transparent');
    ctx.globalAlpha = glow * 0.7;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fly.x, fly.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#B0FFB0';
    ctx.beginPath();
    ctx.arc(fly.x, fly.y, fly.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFalling(ctx: CanvasRenderingContext2D, p: FallingParticle): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    const depthScale = (p.kind === 'ribbon' ? 0.4 : 0.5) + p.depth * 0.6;
    ctx.globalAlpha = 0.6 + p.depth * 0.4;
    const pulseScale = p.kind === 'heart' ? 1 + Math.sin(p.pulse) * 0.1 : 1;
    ctx.scale(depthScale * pulseScale, depthScale * pulseScale);
    if (p.kind === 'ribbon') {
      this.drawRibbon(ctx, p);
    } else if (p.kind === 'candy') {
      this.drawCandy(ctx, p);
    } else if (p.kind === 'heart') {
      this.drawHeart(ctx, p);
    } else {
      this.drawDayStar(ctx, p);
    }
    ctx.restore();
  }

  private drawRibbon(ctx: CanvasRenderingContext2D, p: FallingParticle): void {
    const wave = Math.sin(p.wobble) * 4;
    const halfW = p.width / 2;
    const halfH = p.height / 2;
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.moveTo(-halfW + wave, -halfH);
    ctx.bezierCurveTo(halfW * 0.5, -halfH * 0.5 + wave, halfW, halfH * 0.5 - wave, halfW + wave * 0.5, halfH);
    ctx.lineTo(-halfW + wave * 0.5, halfH);
    ctx.bezierCurveTo(-halfW * 0.8, halfH * 0.3 + wave, -halfW * 0.5, -halfH * 0.3 - wave, -halfW + wave, -halfH);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(-halfW / 2, -halfH / 2, halfW * 0.5, halfH * 0.25);
  }

  private drawCandy(ctx: CanvasRenderingContext2D, p: FallingParticle): void {
    const size = p.size;
    if (p.candyType === 0) {
      // 棒棒糖
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = p.stripeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.7, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    } else if (p.candyType === 1) {
      // 棒糖
      ctx.fillStyle = '#E8D898';
      ctx.fillRect(-1.5, size, 3, size * 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = p.stripeColor;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.4 + i * 0.2), 0, Math.PI * 1.5);
        ctx.stroke();
      }
    } else {
      // 胶囊糖
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.5, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = p.stripeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size * 1.2, 0);
      ctx.quadraticCurveTo(-size * 0.5, -size * 0.5, 0, 0);
      ctx.quadraticCurveTo(size * 0.5, size * 0.5, size * 1.2, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-size * 0.5, -size * 0.2, size * 0.4, size * 0.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, p: FallingParticle): void {
    const size = p.size;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.3, -size, -size, 0, -size * 0.5);
    ctx.bezierCurveTo(size, -size, size, -size * 0.3, 0, size * 0.3);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.2, size * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }

  private drawDayStar(ctx: CanvasRenderingContext2D, p: FallingParticle): void {
    const spikes = p.points;
    const outerRadius = p.size;
    const innerRadius = p.size * 0.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-p.size * 0.2, -p.size * 0.2, p.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }

  private drawShootingStar(ctx: CanvasRenderingContext2D, star: ShootingStar): void {
    // 尾迹长度与速度、随机长度挂钩（对齐参考站公式）
    const tailX = star.x - star.vx * 0.1 * (star.length / 8);
    const tailY = star.y - star.vy * 0.1 * (star.length / 8);
    ctx.save();
    ctx.globalAlpha = star.life;
    const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(230, 240, 255, 0.9)');
    gradient.addColorStop(1, 'transparent');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = star.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(star.x, star.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    // 头部光晕 + 白色亮核
    const headGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 6);
    headGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    headGradient.addColorStop(0.3, 'rgba(230, 240, 255, 0.6)');
    headGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(star.x, star.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let manager: StarryBackground | null = null;
let enabledWatcher: MutationObserver | null = null;

const timeNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const isEnabledOnBody = (): boolean => {
  const value = document.body.dataset.starryEnabled;
  return value !== 'false';
};

// 开关闭合/断开实时生效；watcher 挂在模块层，实例销毁后仍能监听重新开启
const syncFromBody = () => {
  if (!isEnabledOnBody()) {
    if (manager) {
      manager.destroy();
      manager = null;
    }
    return;
  }
  if (!manager) {
    manager = new StarryBackground();
    manager.init();
  }
};

const boot = () => {
  enabledWatcher = new MutationObserver(syncFromBody);
  enabledWatcher.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-starry-enabled']
  });
  syncFromBody();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { StarryBackground };
