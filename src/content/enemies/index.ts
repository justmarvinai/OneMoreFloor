/**
 * The bestiary.
 *
 * A starting roster covering floors 1–100, enough for every band the floor
 * generator authors by hand; the full EA volume agreed in Q12 (~30 enemies across
 * ~8 families, 10 bosses) lands in M8. Beyond the authored floors the generator
 * composes these bases with scaling and modifiers, so the tower never runs out
 * (Brief §3.1).
 *
 * Every avatar is FantasyUI's silhouette for now (Brief §4.3): the owner supplies
 * real portraits later, and each is a one-field change.
 */
import {
  CHILL,
  CURSE_OF_LEAD,
  FURY,
  GLOOM,
  HEXED,
  QUICKENING,
  RUST,
  SAP,
  STONESKIN,
  SUNDERED,
  WITHERING,
} from './effects.ts';
import type { BossDef, EnemyDef } from './types.ts';

/** Until real enemy art arrives, everything wears the same silhouette (§4.3). */
const SILHOUETTE = 'silhouette-warrior-m';

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'enemy.spire-rat',
    nameKey: 'enemy.spireRat',
    family: 'vermin',
    avatar: SILHOUETTE,
    profile: { hp: 0.7, strength: 0.85, defense: 0.6, speed: 1.4 },
    floors: [1, 14],
    weight: 10,
  },
  {
    id: 'enemy.cutpurse',
    nameKey: 'enemy.cutpurse',
    family: 'brigand',
    avatar: SILHOUETTE,
    profile: { hp: 0.9, strength: 1, defense: 0.8, luck: 1.3 },
    playerDebuff: GLOOM,
    floors: [1, 22],
    weight: 9,
  },
  {
    id: 'enemy.rubble-golem',
    nameKey: 'enemy.rubbleGolem',
    family: 'construct',
    avatar: SILHOUETTE,
    profile: { hp: 1.5, strength: 1.05, defense: 1.6, speed: 0.5 },
    playerDebuff: RUST,
    floors: [4, 40],
    weight: 8,
  },
  {
    id: 'enemy.cave-lurker',
    nameKey: 'enemy.caveLurker',
    family: 'beast',
    avatar: SILHOUETTE,
    profile: { hp: 1.1, strength: 1.2, defense: 0.85, speed: 1.15 },
    floors: [8, 45],
    weight: 8,
  },
  {
    id: 'enemy.bone-piper',
    nameKey: 'enemy.bonePiper',
    family: 'undead',
    avatar: SILHOUETTE,
    profile: { hp: 1, strength: 1.1, defense: 0.95, resource: 1.4 },
    playerDebuff: CHILL,
    floors: [14, 62],
    weight: 8,
  },
  {
    id: 'enemy.grave-warden',
    nameKey: 'enemy.graveWarden',
    family: 'undead',
    avatar: SILHOUETTE,
    profile: { hp: 1.35, strength: 1.15, defense: 1.25 },
    playerDebuff: SAP,
    floors: [22, 80],
    weight: 7,
  },
  {
    id: 'enemy.ember-hound',
    nameKey: 'enemy.emberHound',
    family: 'infernal',
    avatar: SILHOUETTE,
    profile: { hp: 0.95, strength: 1.45, defense: 0.8, speed: 1.3 },
    floors: [35, 95],
    weight: 7,
  },
  {
    id: 'enemy.ash-revenant',
    nameKey: 'enemy.ashRevenant',
    family: 'infernal',
    avatar: SILHOUETTE,
    profile: { hp: 1.25, strength: 1.3, defense: 1.1, luck: 1.2 },
    playerDebuff: SAP,
    floors: [55, 100],
    weight: 7,
  },
];

/**
 * Bosses, one per ten floors through the authored range (Brief §3.1). Each
 * debuffs the player *and* buffs itself, which is what makes a boss floor a
 * different fight rather than a longer one (§3.2).
 */
export const BOSSES: readonly BossDef[] = [
  {
    id: 'boss.warden-of-the-gate',
    nameKey: 'boss.wardenOfTheGate',
    family: 'construct',
    avatar: SILHOUETTE,
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
    avatar: SILHOUETTE,
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
    avatar: SILHOUETTE,
    profile: { hp: 1.3, resource: 1.6 },
    playerDebuff: CURSE_OF_LEAD,
    selfBuff: STONESKIN,
    hasSignature: true,
    floors: [30, 30],
    weight: 1,
  },
  {
    id: 'boss.pale-matriarch',
    nameKey: 'boss.paleMatriarch',
    family: 'beast',
    avatar: SILHOUETTE,
    profile: { strength: 1.25, speed: 1.3 },
    playerDebuff: WITHERING,
    selfBuff: FURY,
    hasSignature: true,
    floors: [40, 40],
    weight: 1,
  },
  {
    id: 'boss.cinder-tyrant',
    nameKey: 'boss.cinderTyrant',
    family: 'infernal',
    avatar: SILHOUETTE,
    profile: { hp: 1.35, strength: 1.3, defense: 1.15 },
    playerDebuff: SUNDERED,
    selfBuff: QUICKENING,
    hasSignature: true,
    floors: [50, 100],
    weight: 1,
  },
];

export { ENEMY_MODIFIERS } from './modifiers.ts';
export type { BossDef, EnemyDef, EnemyFamily } from './types.ts';

export function enemiesForFloor(floor: number): EnemyDef[] {
  return ENEMIES.filter((enemy) => floor >= enemy.floors[0] && floor <= enemy.floors[1]);
}

export function bossForFloor(floor: number): BossDef | undefined {
  const exact = BOSSES.find((boss) => floor >= boss.floors[0] && floor <= boss.floors[1]);
  // Past the authored bosses the deepest one keeps serving, scaled by the floor
  // curve; M8 authors the rest (Q12).
  return exact ?? BOSSES.at(-1);
}

export function getEnemy(id: string): EnemyDef | undefined {
  return [...ENEMIES, ...BOSSES].find((enemy) => enemy.id === id);
}
