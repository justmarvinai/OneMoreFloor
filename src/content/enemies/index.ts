/**
 * The bestiary (Brief §3.1/§4.3, Q12).
 *
 * Thirty enemies across eight families covering floors 1–100, roughly three
 * candidates on any given floor, plus ten bosses — one per ten floors. Past the
 * authored range the generator keeps composing these with scaling and modifiers,
 * so the tower never runs out (§3.1).
 *
 * An enemy is a *profile*, not a stat block: multipliers over the floor curve.
 * That is what lets the Spire Rat of floor 3 and the Slag Colossus of floor 96
 * be authored the same way and still be different fights, and what keeps the
 * roster meaningful at floor 5000 (§3.7).
 *
 * **Families are the unit of place.** A band names the families that live in it,
 * and the generator draws only from those — so the Undercroft is vermin and
 * thieves, the Ossuary is bones and old spellwork, and a stretch of floors reads
 * as somewhere rather than as a number.
 *
 * Avatars bind by id with FantasyUI's silhouette as the fallback (§4.3). Where
 * the library ships art that genuinely *is* the enemy — a dire wolf, a hellhound,
 * a basilisk eye — the enemy wears it, because a screen of identical grey
 * silhouettes reads as unfinished (§2.1). Where nothing fits, the silhouette
 * stands: a mismatched portrait reads as a bug, the fallback reads as art still
 * to come. ⧗Q28 asks the owner which way to close the gap.
 */
import {
  BLOODRAGE,
  CARAPACE,
  CHILL,
  CURSE_OF_LEAD,
  DRAIN,
  EXSANGUINATION,
  FRAY,
  FURY,
  GLOOM,
  HEXED,
  MIRE,
  OMEN,
  PALSY,
  QUICKENING,
  RUST,
  SAP,
  SEEPAGE,
  SHATTERED_GUARD,
  SILENCE,
  SPITE,
  STONESKIN,
  SUNDERED,
  WEARINESS,
  WELLSPRING,
  WITHERING,
} from './effects.ts';
import type { BossDef, EnemyDef } from './types.ts';

/** The fallback every enemy without fitting art falls back to (Brief §4.3). */
const SILHOUETTE = 'silhouette-warrior-m';

export const ENEMIES: readonly EnemyDef[] = [
  // --- Vermin: fast, fragile, and never alone ------------------------------
  {
    id: 'enemy.spire-rat',
    nameKey: 'enemy.spireRat',
    family: 'vermin',
    avatar: SILHOUETTE,
    profile: { hp: 0.7, strength: 0.85, defense: 0.6, speed: 1.4 },
    floors: [1, 14],
    // Weighted below its neighbours on purpose: the Spire Rat is the one enemy
    // still wearing the §4.3 silhouette, and floor 1 is the worst place in the
    // game to show placeholder art (⧗Q28). It is common, not the default.
    weight: 6,
  },
  {
    id: 'enemy.midden-swarm',
    nameKey: 'enemy.middenSwarm',
    family: 'vermin',
    avatar: 'blood-toxin-flow',
    profile: { hp: 0.65, strength: 0.9, defense: 0.55, speed: 1.5, luck: 1.1 },
    playerDebuff: SPITE,
    floors: [1, 16],
    weight: 9,
  },
  {
    id: 'enemy.cellar-tick',
    nameKey: 'enemy.cellarTick',
    family: 'vermin',
    avatar: 'earth-fungal-stone',
    profile: { hp: 0.85, strength: 0.8, defense: 0.9, speed: 0.9 },
    playerDebuff: SEEPAGE,
    floors: [3, 20],
    weight: 7,
  },
  {
    id: 'enemy.sump-crawler',
    nameKey: 'enemy.sumpCrawler',
    family: 'vermin',
    avatar: 'blood-corruption',
    profile: { hp: 1.15, strength: 1.05, defense: 0.85, speed: 1.2 },
    playerDebuff: SEEPAGE,
    floors: [30, 58],
    weight: 8,
  },

  // --- Brigands: people who got here first and stayed ----------------------
  {
    id: 'enemy.cutpurse',
    nameKey: 'enemy.cutpurse',
    family: 'brigand',
    avatar: 'hero-lone-wanderer',
    profile: { hp: 0.9, strength: 1, defense: 0.8, luck: 1.3 },
    playerDebuff: GLOOM,
    floors: [1, 22],
    weight: 11,
  },
  {
    id: 'enemy.stair-skulker',
    nameKey: 'enemy.stairSkulker',
    family: 'brigand',
    avatar: 'hero-duelist',
    profile: { hp: 0.95, strength: 1.1, defense: 0.75, speed: 1.2 },
    floors: [2, 24],
    weight: 8,
  },
  {
    id: 'enemy.rope-cutter',
    nameKey: 'enemy.ropeCutter',
    family: 'brigand',
    avatar: 'hero-nightwatch',
    profile: { hp: 1, strength: 1.15, defense: 0.9, luck: 1.15 },
    playerDebuff: FRAY,
    floors: [6, 30],
    weight: 8,
  },
  {
    id: 'enemy.chain-bruiser',
    nameKey: 'enemy.chainBruiser',
    family: 'brigand',
    avatar: 'hero-berserker',
    profile: { hp: 1.3, strength: 1.25, defense: 1, speed: 0.8 },
    playerDebuff: WEARINESS,
    floors: [14, 40],
    weight: 8,
  },

  // --- Beasts: what nests in a tower nobody sweeps -------------------------
  {
    id: 'enemy.cave-lurker',
    nameKey: 'enemy.caveLurker',
    family: 'beast',
    avatar: 'hunt-prowling-cat',
    profile: { hp: 1.1, strength: 1.2, defense: 0.85, speed: 1.15 },
    floors: [8, 45],
    weight: 8,
  },
  {
    id: 'enemy.stair-wolf',
    nameKey: 'enemy.stairWolf',
    family: 'beast',
    avatar: 'hunt-dire-wolf',
    profile: { hp: 1, strength: 1.25, defense: 0.8, speed: 1.35 },
    playerDebuff: MIRE,
    floors: [12, 38],
    weight: 9,
  },
  {
    id: 'enemy.roost-harrier',
    nameKey: 'enemy.roostHarrier',
    family: 'beast',
    avatar: 'hunt-crow-swarm',
    profile: { hp: 0.85, strength: 1.15, defense: 0.7, speed: 1.6, luck: 1.2 },
    playerDebuff: FRAY,
    floors: [18, 50],
    weight: 7,
  },
  {
    id: 'enemy.pale-stalker',
    nameKey: 'enemy.paleStalker',
    family: 'beast',
    avatar: 'blood-cursed-beast',
    profile: { hp: 1.25, strength: 1.4, defense: 0.95, speed: 1.25 },
    playerDebuff: WEARINESS,
    floors: [50, 88],
    weight: 7,
  },

  // --- Constructs: the spire's staff, still on duty ------------------------
  {
    id: 'enemy.rubble-golem',
    nameKey: 'enemy.rubbleGolem',
    family: 'construct',
    avatar: 'hero-stone-golem',
    profile: { hp: 1.5, strength: 1.05, defense: 1.6, speed: 0.5 },
    playerDebuff: RUST,
    floors: [4, 46],
    weight: 8,
  },
  {
    id: 'enemy.clockwork-sentry',
    nameKey: 'enemy.clockworkSentry',
    family: 'construct',
    avatar: 'tech-piston-fist',
    profile: { hp: 1.2, strength: 1.15, defense: 1.35, speed: 0.85 },
    playerDebuff: MIRE,
    floors: [16, 54],
    weight: 7,
  },
  {
    id: 'enemy.brass-warden',
    nameKey: 'enemy.brassWarden',
    family: 'construct',
    avatar: 'tech-arc-lantern',
    profile: { hp: 1.35, strength: 1.1, defense: 1.45, resource: 1.3, speed: 0.7 },
    playerDebuff: RUST,
    floors: [32, 66],
    weight: 7,
  },
  {
    id: 'enemy.slag-colossus',
    nameKey: 'enemy.slagColossus',
    family: 'construct',
    avatar: 'tech-mech-suit',
    profile: { hp: 1.7, strength: 1.3, defense: 1.5, speed: 0.55 },
    playerDebuff: MIRE,
    floors: [70, 100],
    weight: 6,
  },

  // --- Arcane: spellwork that outlived whoever cast it ---------------------
  {
    id: 'enemy.works-wisp',
    nameKey: 'enemy.worksWisp',
    family: 'arcane',
    avatar: 'orb-voidspiral',
    profile: { hp: 0.75, strength: 1.1, defense: 0.7, resource: 1.7, speed: 1.3 },
    playerDebuff: DRAIN,
    floors: [26, 56],
    weight: 8,
  },
  {
    id: 'enemy.tome-bound',
    nameKey: 'enemy.tomeBound',
    family: 'arcane',
    avatar: 'blood-ritualist',
    profile: { hp: 1.05, strength: 1.2, defense: 0.9, resource: 1.5 },
    playerDebuff: SAP,
    floors: [34, 68],
    weight: 7,
  },
  {
    id: 'enemy.glass-serpent',
    nameKey: 'enemy.glassSerpent',
    family: 'arcane',
    avatar: 'blood-serpent-coil',
    profile: { hp: 0.95, strength: 1.35, defense: 0.75, speed: 1.45 },
    playerDebuff: CHILL,
    floors: [40, 74],
    weight: 7,
  },
  {
    id: 'enemy.sigil-eater',
    nameKey: 'enemy.sigilEater',
    family: 'arcane',
    avatar: 'rune-obsidian-seal',
    profile: { hp: 1.2, strength: 1.25, defense: 1.05, resource: 1.8 },
    playerDebuff: DRAIN,
    floors: [52, 90],
    weight: 7,
  },

  // --- Undead: the previous climbers ---------------------------------------
  {
    id: 'enemy.bone-piper',
    nameKey: 'enemy.bonePiper',
    family: 'undead',
    avatar: 'hero-blue-cultist',
    profile: { hp: 1, strength: 1.1, defense: 0.95, resource: 1.4 },
    playerDebuff: CHILL,
    floors: [55, 78],
    weight: 8,
  },
  {
    id: 'enemy.grave-warden',
    nameKey: 'enemy.graveWarden',
    family: 'undead',
    avatar: 'blood-skull',
    profile: { hp: 1.35, strength: 1.15, defense: 1.25 },
    playerDebuff: SAP,
    floors: [58, 88],
    weight: 7,
  },
  {
    id: 'enemy.choirghast',
    nameKey: 'enemy.choirghast',
    family: 'undead',
    avatar: 'blood-pale-priest',
    profile: { hp: 1.1, strength: 1.2, defense: 0.9, resource: 1.6, speed: 1.1 },
    playerDebuff: DRAIN,
    floors: [62, 96],
    weight: 7,
  },
  {
    id: 'enemy.barrow-knight',
    nameKey: 'enemy.barrowKnight',
    family: 'undead',
    avatar: 'hero-voidguard',
    profile: { hp: 1.45, strength: 1.3, defense: 1.35, speed: 0.85 },
    playerDebuff: RUST,
    floors: [68, 100],
    weight: 7,
  },

  // --- Infernal: where the spire burns --------------------------------------
  {
    id: 'enemy.ember-hound',
    nameKey: 'enemy.emberHound',
    family: 'infernal',
    avatar: 'fire-hellhound',
    profile: { hp: 0.95, strength: 1.45, defense: 0.8, speed: 1.3 },
    floors: [35, 95],
    weight: 7,
  },
  {
    id: 'enemy.ash-revenant',
    nameKey: 'enemy.ashRevenant',
    family: 'infernal',
    avatar: 'hero-emberknight',
    profile: { hp: 1.25, strength: 1.3, defense: 1.1, luck: 1.2 },
    playerDebuff: SAP,
    floors: [55, 100],
    weight: 7,
  },
  {
    id: 'enemy.cinder-wretch',
    nameKey: 'enemy.cinderWretch',
    family: 'infernal',
    avatar: 'fire-immolation',
    profile: { hp: 1.1, strength: 1.55, defense: 0.85, speed: 1.2 },
    playerDebuff: WEARINESS,
    floors: [68, 100],
    weight: 7,
  },

  // --- Aberration: the parts of the tower that stopped agreeing -------------
  {
    id: 'enemy.warp-eaten',
    nameKey: 'enemy.warpEaten',
    family: 'aberration',
    avatar: 'tech-warp-disc',
    profile: { hp: 1.2, strength: 1.3, defense: 1, resource: 1.5, luck: 1.2 },
    playerDebuff: DRAIN,
    floors: [56, 100],
    weight: 6,
  },
  {
    id: 'enemy.rift-maw',
    nameKey: 'enemy.riftMaw',
    family: 'aberration',
    avatar: 'blood-nightwing',
    profile: { hp: 1.4, strength: 1.4, defense: 1.05, speed: 1.1 },
    playerDebuff: SPITE,
    floors: [62, 100],
    weight: 6,
  },
  {
    id: 'enemy.hollow-gaze',
    nameKey: 'enemy.hollowGaze',
    family: 'aberration',
    avatar: 'fire-basilisk-eye',
    profile: { hp: 1.15, strength: 1.35, defense: 0.95, luck: 1.5, speed: 1.15 },
    playerDebuff: GLOOM,
    floors: [72, 100],
    weight: 6,
  },
];

/**
 * Bosses, one per ten floors through the authored range (Brief §3.1). Each
 * debuffs the player *and* buffs itself, which is what makes a boss floor a
 * different fight rather than a longer one (§3.2).
 *
 * The kits are chosen as a *sequence*, not individually: no two consecutive
 * bosses attack the same stat, so a player who has just learned to survive the
 * Warden's armour cannot beat the Gutter King the same way. Read down the list
 * and every gate asks a different question — armour, burst, tempo, a race, a
 * starved resource, a grind, crits, raw damage, speed-and-shred, and finally
 * everything at once.
 */
export const BOSSES: readonly BossDef[] = [
  {
    id: 'boss.warden-of-the-gate',
    nameKey: 'boss.wardenOfTheGate',
    family: 'construct',
    avatar: 'hero-vanguard',
    profile: { hp: 1.2, defense: 1.2 },
    playerDebuff: SUNDERED,
    selfBuff: STONESKIN,
    hasSignature: true,
    floors: [10, 10],
    weight: 1,
  },
  {
    id: 'boss.gutter-king',
    nameKey: 'boss.gutterKing',
    family: 'brigand',
    avatar: 'hero-brute',
    profile: { strength: 1.15, luck: 1.3 },
    playerDebuff: HEXED,
    selfBuff: FURY,
    hasSignature: true,
    floors: [20, 20],
    weight: 1,
  },
  {
    id: 'boss.hollow-choir',
    nameKey: 'boss.hollowChoir',
    family: 'undead',
    avatar: 'blood-necromancer',
    profile: { hp: 1.3, resource: 1.6 },
    playerDebuff: CURSE_OF_LEAD,
    selfBuff: WELLSPRING,
    hasSignature: true,
    floors: [30, 30],
    weight: 1,
  },
  {
    id: 'boss.pale-matriarch',
    nameKey: 'boss.paleMatriarch',
    family: 'beast',
    avatar: 'hero-green-sorceress',
    profile: { strength: 1.25, speed: 1.3 },
    playerDebuff: WITHERING,
    selfBuff: QUICKENING,
    hasSignature: true,
    floors: [40, 40],
    weight: 1,
  },
  {
    id: 'boss.brass-conclave',
    nameKey: 'boss.brassConclave',
    family: 'arcane',
    avatar: 'hero-spellblade',
    profile: { resource: 1.7, defense: 1.15, hp: 1.1 },
    playerDebuff: SILENCE,
    selfBuff: STONESKIN,
    hasSignature: true,
    floors: [50, 50],
    weight: 1,
  },
  {
    id: 'boss.sump-mother',
    nameKey: 'boss.sumpMother',
    family: 'vermin',
    avatar: 'blood-plague-drake',
    profile: { hp: 1.6, defense: 1.1, speed: 0.8 },
    playerDebuff: EXSANGUINATION,
    selfBuff: CARAPACE,
    hasSignature: true,
    floors: [60, 60],
    weight: 1,
  },
  {
    id: 'boss.grave-tide',
    nameKey: 'boss.graveTide',
    family: 'undead',
    avatar: 'blood-witch',
    profile: { luck: 1.5, strength: 1.15, hp: 1.15 },
    playerDebuff: PALSY,
    selfBuff: OMEN,
    hasSignature: true,
    floors: [70, 70],
    weight: 1,
  },
  {
    id: 'boss.iron-abbot',
    nameKey: 'boss.ironAbbot',
    family: 'construct',
    avatar: 'hero-warrior-stand',
    profile: { defense: 1.5, strength: 1.25, speed: 0.75 },
    playerDebuff: SHATTERED_GUARD,
    selfBuff: BLOODRAGE,
    hasSignature: true,
    floors: [80, 80],
    weight: 1,
  },
  {
    id: 'boss.cinder-tyrant',
    nameKey: 'boss.cinderTyrant',
    family: 'infernal',
    avatar: 'hero-demon-lord',
    profile: { hp: 1.35, strength: 1.3, defense: 1.15 },
    playerDebuff: SUNDERED,
    selfBuff: QUICKENING,
    hasSignature: true,
    floors: [90, 90],
    weight: 1,
  },
  {
    id: 'boss.the-unmade',
    nameKey: 'boss.theUnmade',
    family: 'aberration',
    avatar: 'hero-voidguard',
    profile: { hp: 1.4, strength: 1.35, luck: 1.3, speed: 1.15 },
    playerDebuff: HEXED,
    selfBuff: BLOODRAGE,
    hasSignature: true,
    floors: [100, 100],
    weight: 1,
  },
];

export { ENEMY_MODIFIERS } from './modifiers.ts';
export type { BossDef, EnemyDef, EnemyFamily } from './types.ts';

export function enemiesForFloor(floor: number): EnemyDef[] {
  return ENEMIES.filter((enemy) => floor >= enemy.floors[0] && floor <= enemy.floors[1]);
}

/**
 * The boss standing on a floor.
 *
 * Within the authored range each gate has its own; past it the roster **cycles
 * by floor** rather than repeating the last one forever. That is the endless
 * tower's compromise: the fights stay hand-authored, but floor 340 is not the
 * same gate as floor 330, and the pick is derived from the floor number so it
 * stays stable without being stored (§3.1).
 */
export function bossForFloor(floor: number): BossDef {
  const exact = BOSSES.find((boss) => floor >= boss.floors[0] && floor <= boss.floors[1]);
  if (exact) return exact;
  const gate = Math.max(0, Math.floor(floor / 10) - 1);
  return BOSSES[gate % BOSSES.length]!;
}

export function getEnemy(id: string): EnemyDef | undefined {
  return [...ENEMIES, ...BOSSES].find((enemy) => enemy.id === id);
}
