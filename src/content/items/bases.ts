/**
 * Base item types (Brief §9, CONTENT_PIPELINE §2).
 *
 * Items are fully generative (Q12): these bases decide what a piece *is* — its
 * slot, who may wear it, its affix pool and its art — and the generator decides
 * how good it is. Three depth tiers per slot keep shops and drops from repeating
 * themselves without needing a base type per floor.
 *
 * Icons follow Q27: curated FantasyUI art bound by id, so replacing them with
 * commissioned item art later is a data change and nothing else.
 */
import type { EquipSlotId } from '@/domain/character/types.ts';
import type { AffixPoolId, ItemDef, WeaponKind } from '@/domain/items/types.ts';
import type { StringKey } from '@/strings/index.ts';

/**
 * Bracket ranges per depth tier. They overlap heavily, so the transition between
 * tiers is a gradual shift in what drops rather than a hard cutover.
 */
const TIER_BRACKETS: Record<1 | 2 | 3, [number, number]> = {
  1: [0, 13],
  2: [9, 26],
  3: [22, 39],
};

const ACCESSORY_BRACKETS: Record<1 | 2, [number, number]> = {
  1: [0, 20],
  2: [15, 39],
};

interface BaseSpec {
  key: string;
  nameKey: StringKey;
  icon: string;
  tier: 1 | 2 | 3;
}

function armor(slot: EquipSlotId, specs: readonly BaseSpec[]): ItemDef[] {
  return specs.map((spec) => ({
    id: `item.${slot}.${spec.key}`,
    slot,
    nameKey: spec.nameKey,
    icon: spec.icon,
    classId: null,
    affixPool: 'armor' as AffixPoolId,
    brackets: TIER_BRACKETS[spec.tier],
  }));
}

function weapon(
  slot: 'mainhand' | 'offhand',
  classId: ItemDef['classId'],
  weaponKind: WeaponKind,
  affixPool: AffixPoolId,
  specs: readonly BaseSpec[],
): ItemDef[] {
  return specs.map((spec) => ({
    id: `item.${slot}.${spec.key}`,
    slot,
    nameKey: spec.nameKey,
    icon: spec.icon,
    classId,
    weaponKind,
    affixPool,
    brackets: TIER_BRACKETS[spec.tier],
  }));
}

function accessory(
  slot: EquipSlotId,
  affixPool: AffixPoolId,
  specs: ReadonlyArray<Omit<BaseSpec, 'tier'> & { tier: 1 | 2 }>,
): ItemDef[] {
  return specs.map((spec) => ({
    id: `item.${slot}.${spec.key}`,
    slot,
    nameKey: spec.nameKey,
    icon: spec.icon,
    classId: null,
    affixPool,
    brackets: ACCESSORY_BRACKETS[spec.tier],
  }));
}

export const ITEM_BASES: readonly ItemDef[] = [
  // --- Armour: worn by every class (Brief §8.2) -----------------------------
  ...armor('helmet', [
    { key: 'padded-coif', nameKey: 'item.helmet.paddedCoif', icon: 'crest-stone-guard', tier: 1 },
    { key: 'iron-helm', nameKey: 'item.helmet.ironHelm', icon: 'crest-warmark', tier: 2 },
    {
      key: 'gilded-crown',
      nameKey: 'item.helmet.gildedCrown',
      icon: 'crest-gilded-crown',
      tier: 3,
    },
  ]),
  ...armor('chest', [
    {
      key: 'travelers-jerkin',
      nameKey: 'item.chest.travelersJerkin',
      icon: 'hero-lone-wanderer',
      tier: 1,
    },
    { key: 'scale-cuirass', nameKey: 'item.chest.scaleCuirass', icon: 'hero-vanguard', tier: 2 },
    { key: 'ember-plate', nameKey: 'item.chest.emberPlate', icon: 'hero-emberknight', tier: 3 },
  ]),
  ...armor('leggings', [
    {
      key: 'wool-breeches',
      nameKey: 'item.leggings.woolBreeches',
      icon: 'earth-mossy-stone',
      tier: 1,
    },
    {
      key: 'banded-greaves',
      nameKey: 'item.leggings.bandedGreaves',
      icon: 'earth-rock-spire',
      tier: 2,
    },
    {
      key: 'obsidian-legguards',
      nameKey: 'item.leggings.obsidianLegguards',
      icon: 'earth-obsidian-rift',
      tier: 3,
    },
  ]),
  ...armor('boots', [
    { key: 'worn-boots', nameKey: 'item.boots.wornBoots', icon: 'earth-cobble-glow', tier: 1 },
    { key: 'striders', nameKey: 'item.boots.striders', icon: 'earth-golden-seed', tier: 2 },
    {
      key: 'quartz-sabatons',
      nameKey: 'item.boots.quartzSabatons',
      icon: 'earth-quartz-beam',
      tier: 3,
    },
  ]),
  ...armor('gauntlets', [
    {
      key: 'leather-grips',
      nameKey: 'item.gauntlets.leatherGrips',
      icon: 'skill-iron-fist',
      tier: 1,
    },
    {
      key: 'crushing-gauntlets',
      nameKey: 'item.gauntlets.crushingGauntlets',
      icon: 'skill-crushing-grip',
      tier: 2,
    },
    { key: 'titan-fists', nameKey: 'item.gauntlets.titanFists', icon: 'skill-titan-fist', tier: 3 },
  ]),
  ...armor('cape', [
    { key: 'patched-cloak', nameKey: 'item.cape.patchedCloak', icon: 'blood-soul-ribbon', tier: 1 },
    { key: 'verdant-mantle', nameKey: 'item.cape.verdantMantle', icon: 'fx-nature-surge', tier: 2 },
    {
      key: 'nightwing-shroud',
      nameKey: 'item.cape.nightwingShroud',
      icon: 'blood-nightwing',
      tier: 3,
    },
  ]),
  ...armor('wrists', [
    { key: 'bronze-bands', nameKey: 'item.wrists.bronzeBands', icon: 'rune-bronze-disc', tier: 1 },
    { key: 'ember-bracers', nameKey: 'item.wrists.emberBracers', icon: 'rune-ember-mark', tier: 2 },
    {
      key: 'gilded-vambraces',
      nameKey: 'item.wrists.gildedVambraces',
      icon: 'rune-gilded-script',
      tier: 3,
    },
  ]),

  // --- Weapons: class-exclusive (Brief §8.2), held per Q15 ------------------
  ...weapon('mainhand', 'warrior', 'two_handed', 'weapon_melee', [
    {
      key: 'warrior-splitting-maul',
      nameKey: 'item.weapon.splittingMaul',
      icon: 'skill-whirlwind',
      tier: 1,
    },
    { key: 'warrior-greatsword', nameKey: 'item.weapon.greatsword', icon: 'fire-slash', tier: 2 },
    {
      key: 'warrior-whitehot-blade',
      nameKey: 'item.weapon.whitehotBlade',
      icon: 'fire-whitehot-blade',
      tier: 3,
    },
  ]),
  ...weapon('mainhand', 'warrior', 'one_handed', 'weapon_melee', [
    {
      key: 'warrior-arming-sword',
      nameKey: 'item.weapon.armingSword',
      icon: 'hunt-gilded-blade',
      tier: 1,
    },
    { key: 'warrior-war-axe', nameKey: 'item.weapon.warAxe', icon: 'fire-golden-flame', tier: 2 },
    {
      key: 'warrior-sanguine-blade',
      nameKey: 'item.weapon.sanguineBlade',
      icon: 'blood-sanguine-blade',
      tier: 3,
    },
  ]),
  ...weapon('offhand', 'warrior', 'shield', 'shield', [
    {
      key: 'warrior-warded-shield',
      nameKey: 'item.weapon.wardedShield',
      icon: 'crest-warded-shield',
      tier: 1,
    },
    {
      key: 'warrior-ember-shield',
      nameKey: 'item.weapon.emberShield',
      icon: 'crest-ember-shield',
      tier: 2,
    },
    {
      key: 'warrior-sacred-anchor',
      nameKey: 'item.weapon.sacredAnchor',
      icon: 'crest-sacred-anchor',
      tier: 3,
    },
  ]),
  ...weapon('mainhand', 'mage', 'two_handed', 'weapon_magic', [
    {
      key: 'mage-apprentice-staff',
      nameKey: 'item.weapon.apprenticeStaff',
      icon: 'rune-flame-sigil',
      tier: 1,
    },
    {
      key: 'mage-emberstorm-staff',
      nameKey: 'item.weapon.emberstormStaff',
      icon: 'orb-emberstorm',
      tier: 2,
    },
    {
      key: 'mage-voidspiral-staff',
      nameKey: 'item.weapon.voidspiralStaff',
      icon: 'orb-voidspiral',
      tier: 3,
    },
  ]),
  ...weapon('mainhand', 'hunter', 'two_handed', 'weapon_ranged', [
    {
      key: 'hunter-hunting-bow',
      nameKey: 'item.weapon.huntingBow',
      icon: 'hunt-piercing-arrow',
      tier: 1,
    },
    {
      key: 'hunter-golden-bow',
      nameKey: 'item.weapon.goldenBow',
      icon: 'hunt-golden-bow',
      tier: 2,
    },
    {
      key: 'hunter-stormfeather-bow',
      nameKey: 'item.weapon.stormfeatherBow',
      icon: 'hunt-arrow-storm',
      tier: 3,
    },
  ]),
  ...weapon('mainhand', 'bard', 'two_handed', 'weapon_magic', [
    {
      key: 'bard-travelers-lute',
      nameKey: 'item.weapon.travelersLute',
      icon: 'fx-lotus-spring',
      tier: 1,
    },
    {
      key: 'bard-verdant-harp',
      nameKey: 'item.weapon.verdantHarp',
      icon: 'orb-verdant-ring',
      tier: 2,
    },
    { key: 'bard-solar-lyre', nameKey: 'item.weapon.solarLyre', icon: 'fx-solar-vortex', tier: 3 },
  ]),
  ...weapon('mainhand', 'swashbuckler', 'one_handed', 'weapon_melee', [
    {
      key: 'swash-jade-dagger',
      nameKey: 'item.weapon.jadeDagger',
      icon: 'hunt-jade-dagger',
      tier: 1,
    },
    {
      key: 'swash-leaf-rapier',
      nameKey: 'item.weapon.leafRapier',
      icon: 'hunt-leaf-blade',
      tier: 2,
    },
    {
      key: 'swash-star-dagger',
      nameKey: 'item.weapon.starDagger',
      icon: 'hunt-star-dagger',
      tier: 3,
    },
  ]),
  // The Swashbuckler's second hand draws from the same family, so a pair can be
  // built from two drops rather than waiting on a dedicated offhand table.
  ...weapon('offhand', 'swashbuckler', 'one_handed', 'weapon_melee', [
    {
      key: 'swash-parrying-dagger',
      nameKey: 'item.weapon.parryingDagger',
      icon: 'hunt-venom-dart',
      tier: 1,
    },
    {
      key: 'swash-duelists-blade',
      nameKey: 'item.weapon.duelistsBlade',
      icon: 'hero-duelist',
      tier: 2,
    },
    {
      key: 'swash-gilded-main-gauche',
      nameKey: 'item.weapon.gildedMainGauche',
      icon: 'hunt-gilded-blade',
      tier: 3,
    },
  ]),

  // --- Accessories: unlocked by ascension (Brief §7), pools per Q5 ----------
  ...accessory('ring', 'accessory_offense', [
    { key: 'arcane-band', nameKey: 'item.ring.arcaneBand', icon: 'fire-arcane-ring', tier: 1 },
    {
      key: 'tracking-ring',
      nameKey: 'item.ring.trackingRing',
      icon: 'hunt-tracking-ring',
      tier: 2,
    },
  ]),
  ...accessory('necklace', 'accessory_offense', [
    {
      key: 'emerald-seal',
      nameKey: 'item.necklace.emeraldSeal',
      icon: 'rune-emerald-seal',
      tier: 1,
    },
    {
      key: 'eclipse-mark',
      nameKey: 'item.necklace.eclipseMark',
      icon: 'rune-eclipse-mark',
      tier: 2,
    },
  ]),
  ...accessory('amulet', 'accessory_defense', [
    { key: 'stone-ward', nameKey: 'item.amulet.stoneWard', icon: 'crest-warded-shield', tier: 1 },
    { key: 'geode-heart', nameKey: 'item.amulet.geodeHeart', icon: 'earth-geode-crystal', tier: 2 },
  ]),
  ...accessory('relic', 'accessory_defense', [
    { key: 'astrolabe', nameKey: 'item.relic.astrolabe', icon: 'icon-astrolabe', tier: 1 },
    {
      key: 'monolith-fragment',
      nameKey: 'item.relic.monolithFragment',
      icon: 'earth-monolith',
      tier: 2,
    },
  ]),
  ...accessory('artifact', 'accessory_offense', [
    {
      key: 'blade-chalice',
      nameKey: 'item.artifact.bladeChalice',
      icon: 'icon-blade-chalice',
      tier: 1,
    },
    { key: 'sun-sigil', nameKey: 'item.artifact.sunSigil', icon: 'fire-sun-sigil', tier: 2 },
  ]),
];
