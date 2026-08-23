/**
 * CombatStage — the fight, performed (COMBAT.md §7; UI_FANTASYUI_MAP §10.1).
 *
 * One of the four allowlisted custom components, and it earns the exemption the
 * way that list intends: it introduces **no new visual language**. Every pixel on
 * screen is a FantasyUI part — `UnitFrame`, `BuffBar`, `FloatingText`,
 * `ImpactFrame`, `DamageVignette`, `BattleLog`, `SceneBackdrop`. What this class
 * adds is *direction*: which part moves, when, and how hard.
 *
 * It is a **dumb interpreter**. The fight was decided before this file ran, so
 * nothing here rolls, compares or decides — it reads beats off a schedule and
 * plays them. That is what makes Skip honest (apply the rest instantly and the
 * end state is identical) and Battle Speed honest (a playback rate over an
 * already-written outcome, §3.5).
 */
import {
  BattleLog,
  BuffBar,
  DamageVignette,
  FloatingText,
  ImpactFrame,
  SceneBackdrop,
  UnitFrame,
  h,
  type FloatOptions,
} from '@/ui/fui/index.ts';
import type { FuiComponent } from '@/ui/fui/index.ts';
import type { CombatScript, EffectDef, UnitId } from '@/domain/combat/types.ts';
import type { StatBlock } from '@/domain/stats.ts';
import { bandForFloor } from '@/content/floors/index.ts';
import { t, type StringKey } from '@/strings/index.ts';
import { choreograph, floatLifeFor, TIMING, type Beat, type Step } from './choreography.ts';
import { effectChip, tipEffects } from './effectChips.ts';

export interface CombatStageOptions {
  script: CombatScript;
  /** The hero's own name — the script carries their class, not their identity. */
  heroName: string;
  heroLevel: number;
  enemyName: string;
  /** Playback multiplier, x1–x8 (Brief §3.5). */
  rate: number;
  /** Called once the last beat has played, or the moment the player skips. */
  onFinished: () => void;
}

/** The stat block printed on each card, in the reference screens' order. */
const CARD_STATS = ['strength', 'defense', 'hp', 'speed', 'luck'] as const;

/** Milliseconds of card motion at x1 — the lunge, the recoil, the collapse. */
const MOTION = {
  lunge: 260,
  recoil: 220,
  signature: 620,
  collapse: 560,
} as const;

export class CombatStage {
  readonly el: HTMLElement;

  private readonly parts: FuiComponent[] = [];
  private readonly frames: Record<UnitId, UnitFrame>;
  private readonly chips: Record<UnitId, BuffBar>;
  private readonly cards: Record<UnitId, HTMLElement>;
  private readonly effects: Record<UnitId, EffectDef[]> = { hero: [], enemy: [] };
  private readonly floats: FloatingText;
  private readonly impact: ImpactFrame;
  private readonly vignette: DamageVignette;
  private readonly log: BattleLog;
  private readonly roundEl: HTMLElement;
  private readonly names: Record<UnitId, string>;
  private readonly beats: Beat[];
  private readonly animations = new Set<Animation>();

  private index = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private signatureTimer: ReturnType<typeof setTimeout> | null = null;
  private waitStartedAt = 0;
  private waitMs = 0;
  private rate: number;
  private round = 0;
  private finished = false;
  private destroyed = false;

  constructor(private readonly opts: CombatStageOptions) {
    const { script, heroName, heroLevel, enemyName } = opts;
    this.rate = opts.rate;
    this.beats = choreograph(script);
    this.names = { hero: heroName, enemy: enemyName };

    const start = script.events[0];
    if (!start || start.type !== 'fightStart') {
      throw new Error('[combat] a script must open with fightStart');
    }

    this.frames = {
      hero: this.track(
        new UnitFrame({
          name: heroName,
          level: heroLevel,
          portraitArt: start.hero.avatar,
          portraitSize: 196,
          health: start.hero.maxHp,
          healthMax: start.hero.maxHp,
          mana: 0,
          manaMax: start.hero.resourcePool,
          manaKind: start.hero.resourceKind === 'focus' ? 'stamina' : start.hero.resourceKind,
          kind: 'player',
        }),
      ),
      enemy: this.track(
        new UnitFrame({
          name: enemyName,
          level: script.floor,
          portraitArt: start.enemy.avatar,
          portraitSize: 196,
          health: start.enemy.maxHp,
          healthMax: start.enemy.maxHp,
          mana: 0,
          manaMax: start.enemy.resourcePool,
          manaKind: 'mana',
          kind: script.isBoss ? 'boss' : 'target',
          ...(script.isBoss ? { elite: t('tower.bossFloor') } : {}),
        }),
      ),
    };

    this.chips = {
      hero: this.track(new BuffBar({ size: 38, autoTick: false })),
      enemy: this.track(new BuffBar({ size: 38, autoTick: false })),
    };

    this.cards = {
      hero: card('hero', this.frames.hero, this.chips.hero, start.hero.stats),
      enemy: card('enemy', this.frames.enemy, this.chips.enemy, start.enemy.stats),
    };

    this.roundEl = h('div', {
      class: 'omf-combat__round',
      dataset: { testid: 'combat-round' },
      text: t('combat.round', { round: 1 }),
    });

    this.floats = this.track(new FloatingText());
    this.impact = this.track(new ImpactFrame({ lines: true }));
    this.vignette = this.track(new DamageVignette({ fullscreen: true, flashMs: 320 }));
    this.log = this.track(
      new BattleLog({
        height: '100%',
        autoScroll: true,
        limit: 400,
      }),
    );

    const banner = h(
      'div',
      { class: 'omf-combat__banner', dataset: { testid: 'combat-banner' } },
      h('span', {
        text: script.isBoss
          ? `${t('tower.floor', { floor: script.floor })} · ${t('tower.bossFloor')}`
          : t('tower.floor', { floor: script.floor }),
      }),
    );

    const field = h(
      'div',
      { class: 'omf-combat__field' },
      banner,
      this.cards.hero,
      this.roundEl,
      this.cards.enemy,
    );

    const backdrop = this.track(
      new SceneBackdrop({
        // Two layers rather than one: the tiled stone reads as a room the fight
        // happens *in*, which a single flat wash never does.
        // The band's own art, pushed far back and out of focus, with the theme's
        // wall over it. Two layers is what turns a dark rectangle into a room.
        layers: [
          {
            art: bandForFloor(script.floor).backdrop,
            depth: 0.08,
            fit: 'cover',
            blur: 30,
            opacity: 0.34,
          },
          { art: 'bg-wide', depth: 0.16, fit: 'cover', opacity: 0.7, blend: 'multiply' },
        ],
        height: '100%',
        scrim: 0.42,
        vignette: 0.6,
        content: field,
      }),
    );

    this.el = h(
      'div',
      { class: 'omf-combat', dataset: { fuiTheme: 'dark-ember', testid: 'combat' } },
      h('div', { class: 'omf-combat__scene' }, backdrop.el, this.floats.el, this.impact.el),
      this.vignette.el,
    );
  }

  /** The fight log, so the screen can place it in its own chrome. */
  get logEl(): HTMLElement {
    return this.log.el;
  }

  /** Begin the performance. */
  play(): this {
    if (this.destroyed || this.finished) return this;
    this.step();
    return this;
  }

  /** Change the playback rate mid-fight (Brief §3.5) — never the outcome. */
  setRate(rate: number): this {
    if (rate === this.rate) return this;
    const elapsed = this.timer === null ? 0 : now() - this.waitStartedAt;
    const remainingAtOldRate = Math.max(0, this.waitMs - elapsed);
    this.rate = rate;
    for (const animation of this.animations) animation.playbackRate = rate;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.schedule((remainingAtOldRate * this.rate) / rate);
    }
    return this;
  }

  /**
   * Skip to the end (Brief §3.4). Every remaining beat is applied without its
   * animation, so the final frame is exactly the one a watched fight ends on.
   */
  skip(): this {
    if (this.finished) return this;
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.signatureTimer !== null) clearTimeout(this.signatureTimer);
    this.timer = null;
    this.signatureTimer = null;
    this.el.classList.remove('is-signature');
    for (const animation of this.animations) animation.finish();
    while (this.index < this.beats.length) {
      this.apply(this.beats[this.index]!.step, true);
      this.index += 1;
    }
    this.finish();
    return this;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.signatureTimer !== null) clearTimeout(this.signatureTimer);
    this.timer = null;
    this.signatureTimer = null;
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    for (const part of this.parts) part.destroy();
    this.el.remove();
  }

  // --- the scheduler --------------------------------------------------------

  private step(): void {
    if (this.destroyed) return;
    const beat = this.beats[this.index];
    if (!beat) {
      this.finish();
      return;
    }

    this.apply(beat.step, false);
    this.index += 1;

    const next = this.beats[this.index];
    if (!next) {
      this.schedule(TIMING.end / this.rate);
      return;
    }
    this.schedule((next.at - beat.at) / this.rate);
  }

  private schedule(delay: number): void {
    this.waitStartedAt = now();
    this.waitMs = delay;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.index >= this.beats.length) this.finish();
      else this.step();
    }, delay);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.timer = null;
    this.opts.onFinished();
  }

  // --- performing one beat --------------------------------------------------

  private apply(step: Step, silent: boolean): void {
    switch (step.kind) {
      case 'start':
        this.frames.hero.setHealth(step.hero.maxHp, step.hero.maxHp);
        this.frames.enemy.setHealth(step.enemy.maxHp, step.enemy.maxHp);
        break;

      case 'round':
        this.round = step.round;
        this.roundEl.textContent = t('combat.round', { round: step.round });
        this.log.push(
          { kind: 'turn', text: t('combat.log.round', { round: step.round }), turn: step.round },
          { silent },
        );
        break;

      case 'windUp': {
        const actor = this.cards[step.unit];
        this.frames[step.unit].setActive(true);
        this.frames[other(step.unit)].setActive(false);
        if (step.action === 'signature') {
          const name = step.signature ? t(`signature.${step.signature}` as StringKey) : '';
          this.log.push(
            {
              kind: 'buff',
              actor: this.names[step.unit],
              text: t('combat.log.signature', { name }),
            },
            { silent },
          );
          if (!silent) {
            this.el.classList.add('is-signature');
            this.animate(actor, signatureFrames(step.unit), MOTION.signature);
            this.impact.setTone('break', 0.85).play(name);
            if (this.signatureTimer !== null) clearTimeout(this.signatureTimer);
            this.signatureTimer = setTimeout(() => {
              this.signatureTimer = null;
              this.el.classList.remove('is-signature');
            }, MOTION.signature / this.rate);
          }
        } else {
          const key = step.action === 'strike' ? 'combat.log.strike' : 'combat.log.doubleStrike';
          this.log.push(
            {
              kind: 'damage',
              actor: this.names[step.unit],
              text: t(key, { target: this.names[other(step.unit)] }),
              turn: this.round,
            },
            { silent },
          );
          if (!silent) this.animate(actor, lungeFrames(step.unit), MOTION.lunge);
        }
        break;
      }

      case 'hit': {
        this.frames[step.target].setHealth(step.targetHp);
        if (silent) break;
        this.floatAbove(step.target, {
          value: step.amount,
          kind: step.crit ? 'crit' : 'damage',
          life: floatLifeFor(step.crit, this.rate),
        });
        this.animate(this.cards[step.target], recoilFrames(step.crit), MOTION.recoil);
        if (step.crit) this.impact.setTone('crit', step.heavy ? 1 : 0.7).play(t('combat.critical'));
        if (step.target === 'hero' && step.heavy) this.vignette.flash('damage', 0.7);
        break;
      }

      case 'dodge':
        this.log.push(
          {
            kind: 'buff',
            actor: this.names[step.unit],
            text: t('combat.log.dodge', { source: this.names[step.source] }),
            turn: this.round,
          },
          { silent },
        );
        if (!silent) {
          this.floatAbove(step.unit, {
            value: t('combat.dodged'),
            kind: 'miss',
            life: floatLifeFor(false, this.rate),
          });
        }
        break;

      case 'resource':
        this.frames[step.unit].setMana(step.to);
        if (step.full && !silent) this.cards[step.unit].classList.add('is-charged');
        if (!step.full) this.cards[step.unit].classList.remove('is-charged');
        break;

      case 'effectOn':
        this.effects[step.unit] = [...this.effects[step.unit], step.effect];
        this.paintChips(step.unit);
        this.log.push(
          {
            kind: step.effect.tone === 'buff' ? 'buff' : 'debuff',
            text: t('combat.log.effectOn', {
              name: t(step.effect.nameKey as StringKey),
              unit: this.names[step.unit],
            }),
            turn: this.round,
          },
          { silent },
        );
        break;

      case 'effectOff': {
        const leaving = this.effects[step.unit].find((effect) => effect.id === step.effectId);
        this.effects[step.unit] = this.effects[step.unit].filter(
          (effect) => effect.id !== step.effectId,
        );
        this.paintChips(step.unit);
        if (leaving) {
          this.log.push(
            {
              kind: leaving.tone === 'buff' ? 'buff' : 'debuff',
              text: t('combat.log.effectOff', {
                name: t(leaving.nameKey as StringKey),
                unit: this.names[step.unit],
              }),
              turn: this.round,
            },
            { silent },
          );
        }
        break;
      }

      case 'defeat':
        this.frames[step.unit].setInactive(true);
        this.cards[step.unit].classList.add('is-defeated');
        this.log.push(
          { kind: 'death', text: t('combat.log.defeated', { unit: this.names[step.unit] }) },
          { silent },
        );
        if (!silent) this.animate(this.cards[step.unit], collapseFrames(), MOTION.collapse);
        break;

      case 'end':
        if (step.byRoundCap) {
          this.log.push({ kind: 'system', text: t('combat.log.roundCap') }, { silent });
        }
        this.frames.hero.setActive(false);
        this.frames.enemy.setActive(false);
        break;
    }
  }

  /** Numbers land across the portrait, where the reference screens put them. */
  private floatAbove(unit: UnitId, options: FloatOptions): void {
    this.floats.spawnAt(this.frames[unit].portrait.el, options);
  }

  private paintChips(unit: UnitId): void {
    const effects = this.effects[unit];
    this.chips[unit].set(effects.map(effectChip));
    // The bar rebuilds its cells on every `set`, so the cards go back on after.
    tipEffects(this.chips[unit].el, effects);
  }

  private animate(target: HTMLElement, frames: Keyframe[], durationMs: number): void {
    if (typeof target.animate !== 'function') return;
    const animation = target.animate(frames, {
      duration: durationMs,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'none',
    });
    animation.playbackRate = this.rate;
    this.animations.add(animation);
    const forget = (): void => {
      this.animations.delete(animation);
    };
    animation.addEventListener('finish', forget, { once: true });
    animation.addEventListener('cancel', forget, { once: true });
  }

  private track<T extends FuiComponent>(component: T): T {
    this.parts.push(component);
    return component;
  }
}

/**
 * The portrait card the reference screens use (§20.3): art, name, bars, and the
 * stat block underneath. The numbers are there because the fight has to explain
 * itself — a player who loses should be able to see why from the cards alone
 * (COMBAT.md §9).
 */
function card(unit: UnitId, frame: UnitFrame, chips: BuffBar, stats: StatBlock): HTMLElement {
  const rows = CARD_STATS.map((stat) =>
    h(
      'div',
      { class: 'omf-combat__stat' },
      h('span', { text: t(`stat.${stat}` as StringKey) }),
      h('span', { class: 'fui-num', text: String(stats[stat]) }),
    ),
  );

  return h(
    'div',
    { class: 'omf-combat__card', dataset: { unit, testid: `combat-card-${unit}` } },
    frame.el,
    chips.el,
    h('div', { class: 'omf-combat__stats' }, ...rows),
  );
}

function other(unit: UnitId): UnitId {
  return unit === 'hero' ? 'enemy' : 'hero';
}

/** A lunge travels toward the middle of the field, so both sides read as meeting. */
function lungeFrames(unit: UnitId): Keyframe[] {
  const toward = unit === 'hero' ? 42 : -42;
  return [
    { transform: 'translateX(0)' },
    { transform: `translateX(${toward * -0.25}px)`, offset: 0.25 },
    { transform: `translateX(${toward}px)`, offset: 0.55 },
    { transform: 'translateX(0)' },
  ];
}

function recoilFrames(crit: boolean): Keyframe[] {
  const shake = crit ? 14 : 7;
  return [
    { transform: 'translateX(0) rotate(0deg)', filter: 'brightness(1)' },
    {
      transform: `translateX(${shake}px) rotate(${crit ? 2.5 : 1.2}deg)`,
      filter: `brightness(${crit ? 2.1 : 1.55})`,
      offset: 0.2,
    },
    { transform: `translateX(${-shake * 0.5}px) rotate(0deg)`, offset: 0.6 },
    { transform: 'translateX(0) rotate(0deg)', filter: 'brightness(1)' },
  ];
}

/** The signature beat: the card swells and the world holds still for a moment. */
function signatureFrames(unit: UnitId): Keyframe[] {
  const toward = unit === 'hero' ? 26 : -26;
  return [
    { transform: 'scale(1) translateX(0)', filter: 'brightness(1)' },
    { transform: 'scale(1.09) translateX(0)', filter: 'brightness(1.7)', offset: 0.35 },
    { transform: `scale(1.04) translateX(${toward}px)`, offset: 0.7 },
    { transform: 'scale(1) translateX(0)', filter: 'brightness(1)' },
  ];
}

function collapseFrames(): Keyframe[] {
  return [
    { transform: 'translateY(0) rotate(0deg)', opacity: '1', filter: 'saturate(1)' },
    { transform: 'translateY(10px) rotate(-2deg)', opacity: '0.75', offset: 0.4 },
    { transform: 'translateY(28px) rotate(-6deg)', opacity: '0.35', filter: 'saturate(0.1)' },
  ];
}

/** Monotonic time for rate changes. Not game logic — nothing here decides anything. */
function now(): number {
  return performance.now();
}
