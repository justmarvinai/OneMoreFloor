/**
 * The English string table — the only place player-facing text is written.
 *
 * EA 0.1 ships English only (Q24), but every string lives here from the first
 * commit so adding a language later is a translation task rather than a refactor.
 * Logic and content data reference keys; neither ever contains a literal.
 */
export const en = {
  'app.title': 'OneMoreFloor',
  'app.tagline': 'Climb the Lootspire. One more floor.',
  'app.enter': 'Enter the Spire',
  'app.build': 'Early Access {version} — foundation build',

  'nav.section.tower': 'Tower',
  'nav.section.character': 'Character',
  'nav.section.merchants': 'Merchants',
  'nav.section.quests': 'Quests',

  'hub.placeholder.title': 'The Spire is still being built',
  'hub.placeholder.message':
    'This is the foundation build: the shell, the save layer and the clock are live. ' +
    'The tower, combat and everything you can spend gold on arrive in the milestones ahead.',

  'save.status.created': 'New save created.',
  'save.status.loaded': 'Save loaded.',
  'save.status.migrated': 'Save loaded and upgraded to the current version.',
  'save.status.recovered':
    'Your save was damaged, so the game restored your last good backup from {when}. ' +
    'The damaged copy was kept, not deleted.',
  'save.status.corrupt':
    'Your save could not be read and no backup could be restored. The damaged data ' +
    'was kept, not deleted, in case it can be recovered later.',

  // --- Character select (Brief §19, Q2) ---
  'select.title': 'Your heroes',
  // One label serves every slot state (play a hero, create in an empty slot),
  // because FantasyUI's CharacterSelect has a single static confirm label. A
  // per-state label is an upstream improvement — see UI_FANTASYUI_MAP §10.
  'select.confirm': 'Continue',
  'select.slot.empty.name': 'Empty slot',
  'select.slot.empty.tagline': 'Create a hero here',
  'select.slot.locked.name': 'Locked slot',
  'select.slot.locked.hint': 'Unlocked with an Account Slot upgrade',
  'select.slot.damaged.name': 'Damaged slot',
  'select.slot.damaged.hint': 'This character could not be read. Nothing was deleted.',
  'select.slot.summary': 'Level {level} {className}',
  'select.slot.floor': 'Best floor {floor}',
  'select.slot.neverClimbed': 'Has not entered the Spire yet',
  'select.create': 'Create a hero',
  'select.reset': 'Reset this slot',
  'select.switch': 'Switch hero',

  // --- Hero creation (Brief §5, §8) ---
  'create.title': 'Name your hero',
  'create.confirm': 'Begin the climb',
  'create.namePlaceholder': 'Name your hero',
  'create.back': 'Back',
  'create.difficulty': 'Demanding to play',
  'create.name.error.tooShort': 'A name needs at least 3 characters.',
  'create.name.error.tooLong': 'A name can be at most 16 characters.',
  'create.name.error.illegalCharacters': 'Letters, numbers, spaces, apostrophes and hyphens only.',
  'create.name.error.noLetter': 'A name needs at least one letter.',
  'create.name.error.duplicate': 'One of your heroes already carries that name.',
  'create.name.error.empty': 'Your hero needs a name.',

  // --- Reset (Brief §19) ---
  'reset.title': 'Reset {name}?',
  'reset.warning':
    'This erases {name} completely: level, gear, materials, currencies and tower progress. ' +
    'It cannot be undone. Your account upgrades are not affected.',
  'reset.prompt': 'Type {name} to confirm.',
  'reset.confirm': 'Erase this hero',
  'reset.cancel': 'Keep my hero',

  // --- Session lock (SAVE_SCHEMA §8) ---
  'lock.title': 'The game is already open',
  'lock.message':
    'OneMoreFloor is running in another tab or window. Two copies would overwrite ' +
    'each other’s progress, so only one can play at a time. Close the other one and ' +
    'reload this page.',

  'error.title': 'Something went wrong',
  'error.message': 'The game hit an error it could not recover from. Your save was not modified.',
  'error.detail': 'Details: {detail}',
  'error.reload': 'Reload the game',

  // --- Stats and resources (Brief §6, §8.1) ---
  'stat.strength': 'Strength',
  'stat.defense': 'Defense',
  'stat.hp': 'Health',
  'stat.resource': 'Resource',
  'stat.luck': 'Luck',
  'stat.speed': 'Speed',
  'resource.rage': 'Rage',
  'resource.mana': 'Mana',
  'resource.focus': 'Focus',

  // --- Classes (Brief §8; mechanics per the approved Q6/Q26 design) ---
  'class.warrior.name': 'Warrior',
  'class.warrior.tagline': 'Heavy armour, heavier swing.',
  'class.warrior.description':
    'The Warrior takes a beating and turns it into one. Rage builds whether he lands ' +
    'a blow or eats one, so long fights favour him — but he is slow, gear rarely gives ' +
    'him Speed, and he has no answer to a fight he cannot reach.',
  'class.warrior.resource.fill': 'Rage builds when you strike and when you are struck.',
  'class.warrior.weapon': 'A two-handed weapon, or a one-handed weapon and a shield.',
  'class.warrior.signature.name': 'Berserk Strike',
  'class.warrior.signature.description':
    'A single devastating blow. Carrying a shield instead turns it into Shield Slam: ' +
    'a heavy hit that leaves you briefly harder to hurt.',

  'class.mage.name': 'Mage',
  'class.mage.tagline': 'Patience, then ruin.',
  'class.mage.description':
    'The Mage gathers Mana every round and spends it on damage nothing armours ' +
    'against. Between bursts she is fragile — the lowest health and defense of the ' +
    'five — so every fight is a race between her timer and theirs.',
  'class.mage.resource.fill': 'Mana gathers steadily, every round.',
  'class.mage.weapon': 'A two-handed staff.',
  'class.mage.signature.name': 'Arcane Blast',
  'class.mage.signature.description':
    'An enormous burst that ignores part of the enemy defense — the answer to ' +
    'anything heavily armoured.',

  'class.hunter.name': 'Hunter',
  'class.hunter.tagline': 'Every arrow looking for the gap.',
  'class.hunter.description':
    'The Hunter turns luck into damage: crits fill her Mana faster, and a full bar ' +
    'buys a flurry where every arrow can crit on its own. Starve her of critical hits ' +
    'and she is merely adequate, and her defense is thin.',
  'class.hunter.resource.fill': 'Mana fills as you land hits, and faster on a critical.',
  'class.hunter.weapon': 'A two-handed bow.',
  'class.hunter.signature.name': 'Piercing Volley',
  'class.hunter.signature.description':
    'A flurry of arrows, each one able to land a critical hit of its own.',

  'class.bard.name': 'Bard',
  'class.bard.tagline': 'A song for every occasion.',
  'class.bard.description':
    'The Bard buffs himself through a fight, smoothing out bad luck with rotating ' +
    'songs. He is the steadiest of the five and the least explosive: no single hit ' +
    'of his will ever headline a fight.',
  'class.bard.resource.fill': 'Mana gathers each round, and faster while a song is playing.',
  'class.bard.weapon': 'A two-handed musical instrument.',
  'class.bard.signature.name': 'Crescendo',
  'class.bard.signature.description':
    'Damage plus a song that lifts your attack, defense or speed for the rounds that follow.',

  'class.swashbuckler.name': 'Swashbuckler',
  'class.swashbuckler.tagline': 'Two blades, no armour, no regrets.',
  'class.swashbuckler.description':
    'The Swashbuckler fights on tempo: two one-handed weapons mean twice the Speed ' +
    'rolls, and Focus builds from dodges and double attacks. When it works she never ' +
    'gets hit. When it does not, she has the health of a rumour.',
  'class.swashbuckler.resource.fill': 'Focus builds on every dodge and every double attack.',
  'class.swashbuckler.weapon': 'Two one-handed weapons, one in each hand.',
  'class.swashbuckler.signature.name': 'Flurry & Feint',
  'class.swashbuckler.signature.description':
    'A burst of rapid strikes that ends with a feint — the next attack against you misses.',

  // --- Rarities (Brief §9.2) ---
  'rarity.common': 'Common',
  'rarity.uncommon': 'Uncommon',
  'rarity.rare': 'Rare',
  'rarity.epic': 'Epic',
  'rarity.legendary': 'Legendary',
  'rarity.mythic': 'Mythical',

  // --- Armour (Brief §9.1) — worn by every class ---
  'item.helmet.paddedCoif': 'Padded Coif',
  'item.helmet.ironHelm': 'Iron Helm',
  'item.helmet.gildedCrown': 'Gilded Crown',
  'item.chest.travelersJerkin': "Traveller's Jerkin",
  'item.chest.scaleCuirass': 'Scale Cuirass',
  'item.chest.emberPlate': 'Ember Plate',
  'item.leggings.woolBreeches': 'Wool Breeches',
  'item.leggings.bandedGreaves': 'Banded Greaves',
  'item.leggings.obsidianLegguards': 'Obsidian Legguards',
  'item.boots.wornBoots': 'Worn Boots',
  'item.boots.striders': 'Spirestriders',
  'item.boots.quartzSabatons': 'Quartz Sabatons',
  'item.gauntlets.leatherGrips': 'Leather Grips',
  'item.gauntlets.crushingGauntlets': 'Crushing Gauntlets',
  'item.gauntlets.titanFists': 'Titan Fists',
  'item.cape.patchedCloak': 'Patched Cloak',
  'item.cape.verdantMantle': 'Verdant Mantle',
  'item.cape.nightwingShroud': 'Nightwing Shroud',
  'item.wrists.bronzeBands': 'Bronze Bands',
  'item.wrists.emberBracers': 'Ember Bracers',
  'item.wrists.gildedVambraces': 'Gilded Vambraces',

  // --- Weapons (Brief §8.1/§8.2) — class-exclusive ---
  'item.weapon.splittingMaul': 'Splitting Maul',
  'item.weapon.greatsword': 'Greatsword',
  'item.weapon.whitehotBlade': 'Whitehot Blade',
  'item.weapon.armingSword': 'Arming Sword',
  'item.weapon.warAxe': 'War Axe',
  'item.weapon.sanguineBlade': 'Sanguine Blade',
  'item.weapon.wardedShield': 'Warded Shield',
  'item.weapon.emberShield': 'Ember Shield',
  'item.weapon.sacredAnchor': 'Sacred Anchor',
  'item.weapon.apprenticeStaff': 'Apprentice Staff',
  'item.weapon.emberstormStaff': 'Emberstorm Staff',
  'item.weapon.voidspiralStaff': 'Voidspiral Staff',
  'item.weapon.huntingBow': 'Hunting Bow',
  'item.weapon.goldenBow': 'Golden Bow',
  'item.weapon.stormfeatherBow': 'Stormfeather Bow',
  'item.weapon.travelersLute': "Traveller's Lute",
  'item.weapon.verdantHarp': 'Verdant Harp',
  'item.weapon.solarLyre': 'Solar Lyre',
  'item.weapon.jadeDagger': 'Jade Dagger',
  'item.weapon.leafRapier': 'Leaf Rapier',
  'item.weapon.starDagger': 'Star Dagger',
  'item.weapon.parryingDagger': 'Parrying Dagger',
  'item.weapon.duelistsBlade': "Duellist's Blade",
  'item.weapon.gildedMainGauche': 'Gilded Main-Gauche',

  // --- Accessories (Brief §7 unlocks, Q5 pools) ---
  'item.ring.arcaneBand': 'Arcane Band',
  'item.ring.trackingRing': 'Tracking Ring',
  'item.necklace.emeraldSeal': 'Emerald Seal',
  'item.necklace.eclipseMark': 'Eclipse Mark',
  'item.amulet.stoneWard': 'Stone Ward',
  'item.amulet.geodeHeart': 'Geode Heart',
  'item.relic.astrolabe': 'Wanderer’s Astrolabe',
  'item.relic.monolithFragment': 'Monolith Fragment',
  'item.artifact.bladeChalice': 'Blade Chalice',
  'item.artifact.sunSigil': 'Sun Sigil',

  // --- Materials (Brief §10.2) ---
  'material.spireDust': 'Spire Dust',
  'material.ironSigil': 'Iron Sigil',
  'material.emberCore': 'Ember Core',
  'material.frostQuartz': 'Frost Quartz',
  'material.voidShard': 'Void Shard',
  'material.astralSeal': 'Astral Seal',
  'material.dragonAsh': 'Dragon Ash',
  'material.spireHeart': 'Heart of the Spire',

  'gate.tooSmall.title': 'A little more room, adventurer',
  'gate.tooSmall.message':
    'OneMoreFloor is built for desktop screens. Widen the window to at least 1280 pixels to play.',
} as const;

export type StringKey = keyof typeof en;
