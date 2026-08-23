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
  'app.cast': 'Five heroes',

  // --- The rail (the hero's own frame, on every hub screen) ---
  'rail.level': 'Level {level}',
  'rail.xp': '{xp} / {next}',
  'rail.xpTip': '{remaining} XP to level {next}. The tower is the only source.',
  'rail.ascension': 'Ascension {tier} of {max}',
  'rail.climb': 'The climb',
  'rail.power': 'PWR',
  'rail.bag': 'BAG',
  'rail.bagTip': '{used} of {capacity} backpack slots used. {free} still free.',
  'rail.bagFullTip':
    'The backpack is full. The next drop cannot be picked up until something is sold, ' +
    'worn or scrapped.',
  'rail.powerTip':
    'Everything you have, as one number: gear, stats, ascension and how deep you have been. ' +
    'It is what decides the quality of every item the tower, the merchants and the rites offer you.',
  'rail.thisRun': 'This run',
  'rail.thisRunTip':
    'Where this climb has reached. A death sends it back to floor 1 — and takes nothing you own.',
  'rail.bestEver': 'Best ever',
  'rail.bestEverTip': 'The deepest floor you have ever cleared. Death never touches this number.',
  'rail.floorValue': 'Floor {floor}',
  'rail.noClimb': 'Not yet',
  'rail.running': 'Running',
  'rail.noPotions': 'No draughts running',
  'currency.gold.what': 'Gold',
  'currency.gold.use': 'What merchants, stat points, gear levels and restocks cost.',
  'currency.gold.where':
    'Every floor pays it, and every piece you sell or salvage adds to it. It is the ' +
    'only money in the game.',
  'currency.tickets.what': 'Summon Ticket',
  'currency.tickets.use': 'One rite each at the Rite of Embers.',
  'currency.tickets.where': 'Dropped by floors and bosses, and paid out by quests.',
  'currency.luckyTickets.what': 'Lucky Ticket',
  'currency.luckyTickets.use': 'One rite each at the Rite of Fortune, where the odds are kinder.',
  'currency.luckyTickets.where':
    'Rare from floors, likelier from bosses, and the reward the tour pays on completion.',

  'nav.hero.toCharacter': 'Open the character sheet',
  'nav.hero.here': 'You are looking at the character sheet',
  'nav.section.tower': 'Tower',
  'nav.section.character': 'Character',
  'nav.section.equipmentMerchant': 'Equipment',
  'nav.section.magicMerchant': 'Alchemist',
  'nav.section.quests': 'Quests',
  'nav.section.gacha': 'Summoning',
  'nav.section.upgrades': 'Account',

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
  // What a material is, said once and derived from its own data — a blurb per
  // material would be eight sentences that all say the same thing (§2.3).
  'material.kind': 'Ascension material',
  'material.tier': 'Tier',
  'material.tierValue': '{tier} of {max}',
  'material.held': 'You hold',
  'material.use': 'Spent on ascending a piece of gear to its next star.',
  'material.where':
    'Found in the tower and in the rites by heroes of about {power} Power Level and up. ' +
    'Climbing deeper is the only way to reach the next tier.',
  'material.spireDust': 'Spire Dust',
  'material.ironSigil': 'Iron Sigil',
  'material.emberCore': 'Ember Core',
  'material.frostQuartz': 'Frost Quartz',
  'material.voidShard': 'Void Shard',
  'material.astralSeal': 'Astral Seal',
  'material.dragonAsh': 'Dragon Ash',
  'material.spireHeart': 'Heart of the Spire',

  // --- Enemies (Brief §4.3; avatars bind by id with a silhouette fallback) ---
  // Vermin — the spire's own rot, thickest near the bottom.
  'enemy.spireRat': 'Spire Rat',
  'enemy.middenSwarm': 'Midden Swarm',
  'enemy.cellarTick': 'Cellar Tick',
  'enemy.sumpCrawler': 'Sump Crawler',

  // Brigands — people who got here first and stayed.
  'enemy.cutpurse': 'Cutpurse',
  'enemy.stairSkulker': 'Stair Skulker',
  'enemy.ropeCutter': 'Rope-Cutter',
  'enemy.chainBruiser': 'Chain Bruiser',

  // Beasts — what nests in a tower nobody sweeps.
  'enemy.caveLurker': 'Cave Lurker',
  'enemy.stairWolf': 'Stair Wolf',
  'enemy.roostHarrier': 'Roost Harrier',
  'enemy.paleStalker': 'Pale Stalker',

  // Constructs — the spire's staff, still on duty.
  'enemy.rubbleGolem': 'Rubble Golem',
  'enemy.clockworkSentry': 'Clockwork Sentry',
  'enemy.brassWarden': 'Brass Warden',
  'enemy.slagColossus': 'Slag Colossus',

  // Arcane — spellwork that outlived whoever cast it.
  'enemy.worksWisp': 'Wisp of the Works',
  'enemy.tomeBound': 'Tome-Bound',
  'enemy.glassSerpent': 'Glass Serpent',
  'enemy.sigilEater': 'Sigil Eater',

  // Undead — the previous climbers.
  'enemy.bonePiper': 'Bone Piper',
  'enemy.graveWarden': 'Grave Warden',
  'enemy.choirghast': 'Choirghast',
  'enemy.barrowKnight': 'Barrow Knight',

  // Infernal — where the spire burns.
  'enemy.emberHound': 'Ember Hound',
  'enemy.ashRevenant': 'Ash Revenant',
  'enemy.cinderWretch': 'Cinder Wretch',

  // Aberration — the parts of the tower that stopped agreeing with the rest.
  'enemy.warpEaten': 'Warp-Eaten',
  'enemy.riftMaw': 'Rift Maw',
  'enemy.hollowGaze': 'Hollow Gaze',

  // --- Bosses (Brief §3.2) — every tenth floor ---
  'boss.wardenOfTheGate': 'Warden of the Gate',
  'boss.gutterKing': 'The Gutter King',
  'boss.hollowChoir': 'The Hollow Choir',
  'boss.paleMatriarch': 'Pale Matriarch',
  'boss.brassConclave': 'The Brass Conclave',
  'boss.sumpMother': 'The Sump Mother',
  'boss.graveTide': 'The Grave Tide',
  'boss.ironAbbot': 'The Iron Abbot',
  'boss.cinderTyrant': 'Cinder Tyrant',
  'boss.theUnmade': 'The Unmade',

  // --- Effects: normal-floor debuffs are deliberately mild (Brief §3.2) ---
  'effect.chill': 'Chilled',
  'effect.gloom': 'Gloom',
  'effect.sap': 'Sapped',
  'effect.rust': 'Rusted',
  'effect.mire': 'Mired',
  'effect.fray': 'Frayed',
  'effect.spite': 'Spite',
  'effect.drain': 'Drained',
  'effect.weariness': 'Weariness',
  'effect.seepage': 'Seepage',

  // --- Effects: boss kits bite far harder ---
  'effect.curseOfLead': 'Curse of Lead',
  'effect.withering': 'Withering',
  'effect.sundered': 'Sundered',
  'effect.hexed': 'Hexed',
  'effect.stoneskin': 'Stoneskin',
  'effect.fury': 'Fury',
  'effect.quickening': 'Quickening',
  'effect.silence': 'Silenced',
  'effect.exsanguination': 'Exsanguination',
  'effect.shatteredGuard': 'Shattered Guard',
  'effect.palsy': 'Palsy',
  'effect.carapace': 'Carapace',
  'effect.omen': 'Omen',
  'effect.wellspring': 'Wellspring',
  'effect.bloodrage': 'Bloodrage',

  // --- Effects: from signature moves (Q26) ---
  'effect.shieldGuard': 'Shield Guard',
  'effect.feint': 'Feint',
  'effect.songOfFury': 'Song of Fury',
  'effect.songOfStone': 'Song of Stone',
  'effect.songOfWind': 'Song of Wind',

  // --- Procedural enemy modifiers (past the authored floors) ---
  'modifier.frenzied': 'Frenzied',
  'modifier.armoured': 'Armoured',
  'modifier.fleet': 'Fleet',
  'modifier.hulking': 'Hulking',
  'modifier.cunning': 'Cunning',
  'modifier.venomous': 'Venomous',
  'modifier.warded': 'Warded',
  'modifier.ravenous': 'Ravenous',
  'modifier.attuned': 'Attuned',

  // --- Signature move names, for the combat log and unit frames ---
  'signature.berserkStrike': 'Berserk Strike',
  'signature.shieldSlam': 'Shield Slam',
  'signature.arcaneBlast': 'Arcane Blast',
  'signature.piercingVolley': 'Piercing Volley',
  'signature.crescendo': 'Crescendo',
  'signature.flurryAndFeint': 'Flurry & Feint',
  'signature.bossOnslaught': 'Onslaught',

  // --- Floor bands (Brief §3.1) ---
  'band.undercroft': 'The Undercroft',
  'band.brokenStair': 'The Broken Stair',
  'band.floodedWorks': 'The Flooded Works',
  'band.ossuary': 'The Ossuary',
  'band.emberReach': 'Ember Reach',
  'band.endlessAscent': 'The Endless Ascent',

  // --- Equipment slots and currencies (Brief §9.1, Q1) ---
  'slot.helmet': 'Helmet',
  'slot.chest': 'Chest',
  'slot.leggings': 'Leggings',
  'slot.boots': 'Boots',
  'slot.gauntlets': 'Gauntlets',
  'slot.cape': 'Cape',
  'slot.wrists': 'Wrists',
  'slot.mainhand': 'Main Hand',
  'slot.offhand': 'Off Hand',
  'slot.ring': 'Ring',
  'slot.necklace': 'Necklace',
  'slot.amulet': 'Amulet',
  'slot.relic': 'Relic',
  'slot.artifact': 'Artifact',

  'currency.gold': 'Gold',
  'currency.tickets': 'Summon Ticket',
  'currency.luckyTickets': 'Lucky Ticket',

  'loot.stat': '+{value} {stat}',
  'loot.noStats': 'No bonus stats',
  'loot.title': 'Loot',
  'loot.take': 'Take All',

  // --- The tower (Brief §3.1–§3.4) ---
  'tower.title': 'The Lootspire',
  'tower.floor': 'Floor {floor}',
  'tower.currentFloor': 'Floor {floor} — {band}',
  'tower.bossFloor': 'Boss Floor',
  'tower.best': 'Best floor',
  'tower.highestNone': 'None yet',
  'tower.fight': 'Fight Floor {floor}',
  'tower.fightBoss': 'Face the Boss — Floor {floor}',
  'tower.quickRaid': 'Quick-Raid to Floor {floor}',
  'tower.quickRaidNote': 'Skip {count} cleared floors, same rewards',
  'tower.preview.modifier': 'Modified: {name}',
  'tower.preview.effects': 'This floor imposes',
  'tower.preview.matchup': 'The matchup',
  'tower.preview.them': 'Them',
  'tower.preview.pays': 'This floor pays',
  'tower.preview.xp': 'XP',
  'tower.preview.gear': 'Gear',
  'tower.preview.paysGold': '~{gold}',
  'tower.preview.paysXp': '~{xp}',
  'tower.preview.paysGear': '{percent}%',
  'tower.preview.paysTip':
    'About {gold} gold and {xp} XP for clearing it, give or take, and a {percent}% chance of a ' +
    'piece of equipment. Bosses pay several floors\u2019 worth at once.',
  'tower.preview.you': 'You',
  'tower.preview.statTip': '{stat} — you {you}, it {them}. {verdict}',
  'tower.preview.ahead': 'You lead here.',
  'tower.preview.behind': 'It leads here.',
  'tower.preview.level': 'Neither of you leads here.',
  'tower.preview.leads': 'You lead on {count} of {total}',
  'tower.band.range': 'Floors {from}–{to}',
  'tower.band.rangeOpen': 'Floor {from} and above',
  'tower.here': 'Here',
  'tower.hereTip': 'Your hero is standing on floor {floor}. This is the fight.',
  'tower.bossTip': 'A boss floor. Harder than the floors around it, and it pays like it.',
  'tower.preview.noEffects': 'No floor modifiers here',
  'tower.stat.strength': 'STR',
  'tower.stat.defense': 'DEF',
  'tower.stat.hp': 'HP',
  'tower.stat.speed': 'SPD',
  'tower.stat.luck': 'LCK',
  'tower.cleared': 'Cleared',

  // --- The fight (Brief §4.1–§4.2, COMBAT.md §7) ---
  'combat.round': 'Round {round}',
  'combat.skip': 'Skip',
  'combat.continue': 'Continue',
  'combat.speed': 'Speed',
  'combat.speedTier': 'x{rate}',
  'combat.speedLocked': 'Battle Speed x{rate} is an account upgrade (§15) — not bought yet.',
  'combat.speedCurrent': 'Playing at x{rate}.',
  'combat.dodged': 'Dodged!',
  'combat.critical': 'CRITICAL',
  'combat.log.title': 'Fight log',
  'combat.log.show': 'Fight log',
  'combat.log.hide': 'Hide log',
  'combat.log.round': 'Round {round} begins',
  'combat.log.strike': 'strikes {target}',
  'combat.log.doubleStrike': 'strikes {target} again',
  'combat.log.signature': 'unleashes {name}',
  'combat.log.dodge': 'dodges {source}',
  'combat.log.effectOn': '{name} takes hold on {unit}',
  'combat.log.effectOff': '{name} fades from {unit}',
  'combat.log.defeated': '{unit} falls',
  'combat.log.roundCap': 'Neither side could finish the other — the spire calls it.',
  'combat.effect.rounds': '{rounds}R',
  // --- Effects, as the player reads them ---
  'effect.buff': 'Boon',
  'effect.debuff': 'Affliction',
  'effect.lasts': 'Lasts',
  'effect.kind.damageReduction': 'Damage taken',
  'effect.describe.lower': '{stat} is {percent}% lower while this holds.',
  'effect.describe.raise': '{stat} is {percent}% higher while this holds.',
  'effect.describe.damageReduction': 'Turns away {percent}% of the damage that lands.',
  'effect.describe.dodgeNext': 'The next attack misses entirely.',

  'combat.effect.wholeFight': 'Whole fight',
  'combat.effect.tooltip': '{name} — {duration}',

  // --- After the fight (COMBAT.md §8) ---
  'result.victory': 'Floor {floor} Cleared',
  'result.victoryBoss': 'Boss Felled — Floor {floor}',
  'result.subtitle': '{name} falls after {rounds} rounds.',
  'result.rounds': 'Rounds',
  'result.healthLeft': 'Health left',
  'result.newBest': 'New best floor',
  'result.next': 'One More Floor',
  'result.back': 'Back to the Spire',
  'result.levelUp': 'Level {level}!',
  'result.loot': 'Taken',
  'result.nothing': 'No drops this time — the gold and the climb still count.',

  'raid.title': 'Quick-Raid complete',
  'raid.titleDied': 'Quick-Raid stopped',
  'raid.subtitle': 'Cleared {count} floors, reaching Floor {floor}.',
  'raid.subtitleDied': 'You fell on Floor {floor} after clearing {count}.',
  'raid.floors': 'Floors cleared',
  'raid.close': 'Continue',

  'death.title': 'The Spire Takes You',
  'death.subtitle': 'Floor {floor} is where this climb ends. The next one starts now.',
  'death.killedBy': '{name}',
  'death.kept': 'Nothing you own was lost',
  'death.keptDetail':
    'Your level, gear, gold, materials and every floor record survive. Only the climb resets.',
  'death.reached': 'Reached',
  'death.best': 'Best ever',
  'death.raid': 'Quick-Raid back to Floor {floor}',
  'death.raidNone': 'Return to the Spire',
  'death.continue': 'Climb again',

  // --- Potions (Brief §12, Q18) ---
  'potion.strength': 'Draught of Might',
  'potion.defense': 'Draught of Iron',
  'potion.hp': 'Draught of Vigour',
  'potion.resource': 'Draught of Essence',
  'potion.luck': 'Draught of Fortune',
  'potion.effect': '+{percent}% {stat} for one hour',
  'potion.active': 'Active — {time} left',
  'potion.replace': 'Drinking again restarts the hour',
  'potion.drink': 'Drink',
  'potion.refresh': 'Refresh',
  'potion.tier': 'Tier {tier}',
  'potion.none': 'No potions running',

  // --- What a stat does (Brief §6) ---
  'stat.hint.strength': '{value} damage a strike',
  'stat.hint.defense': '{percent}% of damage turned away',
  'stat.hint.hp': 'Hit points',
  'stat.hint.resource': 'Signature charges at {value}',
  'stat.hint.luck': '{percent}% critical hits',
  'stat.hint.speed': '{percent}% double attacks — gear only',

  // --- Character screen (Brief §6, §7, §9, §10) ---
  'character.title': '{name}',
  'character.subtitle': 'Level {level} {className}',
  'character.power': 'Power Level',
  'character.ascension': 'Ascension',
  'character.ascend': 'Ascend',
  'character.ascendReady': 'Level cap reached — ascend to raise it',
  'character.ascendLocked': 'Reach level {level} to ascend',
  'character.ascendMax': 'Fully ascended',
  'character.ascendUnlocks': 'Unlocks the {slot} slot',
  'character.ascendDone': 'Ascended to {stars} stars',
  'character.levelCap': 'Level {level} / {cap}',
  'character.levelCapEndless': 'Level {level} — no cap',
  'character.stats': 'Stats',
  'character.buy': 'Buy',
  'character.buyCost': '{cost} gold',
  'character.buyLocked': 'Speed comes only from gear',
  'character.cannotAfford': 'Not enough gold',
  'character.equipment': 'Equipment',
  'character.backpack': 'Backpack ({used} / {capacity})',
  'character.emptySlot': 'Empty',
  'character.lockedSlot': 'Unlocked at Ascension {tier}',
  'character.buffs': 'Active potions',

  // --- Credits (Brief §21) ---
  'credits.title': 'Credits',
  'credits.subtitle': 'What this game is built out of, and who made it.',
  'credits.licence': 'Licence',
  'credits.source': 'Source',
  'credits.fantasyui.title': 'FantasyUI',
  'credits.fantasyui.body':
    'Every window, button, socket and frame you have seen. Vendored into the game, so it runs with the network cable pulled.',
  'credits.icons.title': 'Open Game Icons',
  'credits.icons.body':
    'The faint pictures in your empty gear sockets, showing what each one takes.',

  // --- Items (shared) ---
  'item.level': '+{level}',
  'item.levelFull': 'Level {level} / {max}',
  'item.ascension': '{stars} / {max} stars',
  'item.equip': 'Equip',
  'item.unequip': 'Unequip',
  'item.sell': 'Sell',
  'item.sellFor': 'Sell for {gold}',
  'item.upgrade': 'Upgrade',
  'item.upgradeCost': '{cost} gold',
  'item.upgradeMax': 'Fully upgraded',
  'item.ascend': 'Ascend',
  'item.ascendMax': 'Fully ascended',
  'item.ascendNeeds': 'Needs {materials}',
  'item.materialLine': '{count}× {name}',
  'item.compare': 'Currently worn',
  'item.equipped': 'Worn',
  'item.compare.upgrade': 'Upgrade',
  'item.compare.downgrade': 'Worse',
  'item.compare.sidegrade': 'Sidegrade',
  'item.compare.empty': 'Nothing worn there',
  'item.compare.power': '{delta} power',
  'item.compare.swap': '{from} → {to}',
  'item.compare.upgradeTip': 'Better than the {slot} you are wearing, by {delta} power.',
  'item.compare.downgradeTip': 'Worse than the {slot} you are wearing, by {delta} power.',
  'item.compare.sidegradeTip':
    'Worth the same as the {slot} you are wearing — it moves stats around without moving power.',
  'item.compare.emptyTip': 'That socket is empty, so all of this is a gain.',
  'item.upgradeMark': 'Better than what you are wearing',
  'item.vsEquipped': 'If you wear this instead',
  'item.inspect': 'Click to equip, upgrade or sell',
  'item.dragToEquip': 'Drag onto a socket to wear it, or click for more',
  'item.dragToSell': 'Drag onto the shelf to sell it, or click for more',
  'item.cannotEquip': 'Cannot wear that there',
  'item.equipped.toast': '{name} equipped',
  'item.unequipped.toast': '{name} taken off',
  'item.bagFull': 'Your backpack is full',
  'item.bagFullHint': 'Sell or use something before taking that off.',
  'item.sellTitle': 'Sell {name}?',
  'item.sellBody': 'The merchant offers {gold} gold. A sale cannot be undone.',
  'item.sellConfirm': 'Sell for {gold}',
  'item.sellCancel': 'Keep it',
  'item.sold.toast': 'Sold {name} for {gold} gold',
  'item.sellWornTitle': 'That is still on you',
  'item.sellWornHint': 'Take it off first, then sell it from your backpack.',
  'item.wornHint': 'Click to upgrade, ascend or take off',
  'item.buyHint': 'Buy it to put it in your backpack',
  'item.emptySlot': 'Nothing worn here yet',
  'item.emptySlotHint': 'Loot or buy a piece for this slot, then equip it from the backpack',
  'item.refused.wrongSlot': 'That does not go there',
  'item.refused.slotLocked': 'That slot unlocks at a higher ascension',
  'item.refused.wrongClass': 'Another class carries this',
  'item.refused.wrongWeaponKind': 'Your class cannot hold that',
  'item.refused.offhandBlocked': 'Your two-handed weapon fills both hands',
  'item.refused.notFound': 'That piece is gone',
  'item.refused.backpackFull': 'Your backpack has no room for what comes off',

  // --- Inventory (Q16) ---
  'inventory.full': 'Your backpack is full',
  'inventory.fullDetail':
    'Floor {floor} dropped {name}. Sell something, or leave the new piece behind.',
  'inventory.keepNew': 'Sell the worst piece and keep it',
  'inventory.leaveIt': 'Leave it on the floor',
  'inventory.empty': 'Nothing in the backpack yet — the tower fills it.',
  'inventory.sold': 'Sold {name} for {gold} gold',
  'inventory.lost': 'Left {name} behind',

  // --- Merchants (Brief §11/§12, Q17) ---
  'merchant.equipment': 'Equipment Merchant',
  'merchant.magic': 'Magic Merchant',
  'merchant.equipmentTagline': 'Weapons and armour, sized to your power.',
  'merchant.magicTagline': 'Trinkets and draughts for those who can pay.',
  'merchant.stock': 'For sale',
  'merchant.potions': 'Draughts',
  'merchant.restockLabel': 'New goods in',
  'merchant.restockNow': 'New goods have arrived',
  'merchant.reroll': 'Restock now',
  'merchant.rerollHint': 'Fresh stock, at your power. The wait is free.',
  'merchant.buy': 'Buy',
  'merchant.drink': 'Drink',
  'merchant.price': '{gold} gold',
  'merchant.sold': 'Sold out',
  'merchant.short': '{missing} gold short',
  'merchant.bought': 'Bought {name}',
  'merchant.sellTitle': 'Sell from your backpack',
  'merchant.sellEmpty': 'Nothing to sell.',

  // --- Notifications (§20.5) ---
  'badge.canUpgrade': 'You can afford an upgrade',
  'badge.canAscend': 'Your hero can ascend',
  'badge.canBuy': 'You can afford something here',

  // --- Quests (Brief §17, Q21) ---
  'quest.daily.climb': 'Up the Spire',
  'quest.daily.boss': 'Break a Gate',
  'quest.daily.spend': 'Coin in Motion',
  'quest.daily.upgrade': 'Sharpen What You Have',
  'quest.daily.shop': 'Stock Up',
  'quest.daily.sell': 'Lighten the Load',
  'quest.daily.draught': 'A Drink Before the Climb',
  'quest.weekly.climb': 'The Long Climb',
  'quest.weekly.earn': "A Week's Wages",
  'quest.weekly.upgrade': 'Forge Ahead',
  'quest.weekly.shop': 'Patron of the Spire',
  'quest.weekly.bosses': 'Gatebreaker',
  'quest.weekly.deep': 'Depths Unseen',
  'quest.weekly.fortune': "A Spire-Keeper's Fortune",
  'quest.daily.deep': 'One Floor Further',
  'quest.daily.bank': 'Fill the Purse',
  'quest.daily.hunt': 'Gate After Gate',
  'quest.weekly.spend': 'A Week of Spending',
  'quest.weekly.draughts': "The Alchemist's Regular",
  'quest.weekly.summit': 'The High Reach',

  'quest.objective.clearFloors': 'Clear {target} floors',
  'quest.objective.defeatBosses': 'Defeat {target} bosses',
  'quest.objective.reachFloor': 'Reach floor {target} in one run',
  'quest.objective.earnGold': 'Earn {target} gold',
  'quest.objective.spendGold': 'Spend {target} gold',
  'quest.objective.upgradeGear': 'Upgrade gear {target} times',
  'quest.objective.buyItems': 'Buy {target} pieces from a merchant',
  'quest.objective.sellItems': 'Sell {target} pieces',
  'quest.objective.drinkPotions': 'Drink {target} draughts',

  'quest.title': 'Quest Board',
  'quest.daily': 'Daily',
  'quest.weekly': 'Weekly',
  'quest.hard': 'Hard',
  'quest.progress': '{progress} / {target}',
  'quest.claim': 'Claim',
  'quest.claimed': 'Claimed',
  'quest.remaining': '{remaining} to go before you can claim this.',
  'quest.claimedTip': 'Already claimed. New quests arrive at reset.',
  'quest.claimableTip': 'Finished — take the reward.',
  'quest.resetsIn': 'Resets in',
  'quest.rewards': 'Reward',
  'quest.rewardGold': '{gold} gold',
  'quest.rewardXp': '{xp} XP',
  'quest.rewardTicket': 'Summon Ticket',
  'quest.rewardLucky': 'Lucky Ticket',
  'quest.none': 'No quests on the board yet — clear a floor and come back.',
  'quest.claimedAll': 'Everything here is claimed. New quests arrive at reset.',

  // --- Gacha (Brief §16, Q20) ---
  'gacha.title': 'The Summoning Circle',
  'gacha.subtitle': 'Tickets are rare. What they buy is sized to you — never beyond you.',
  'gacha.banner.ticket.name': 'Rite of Embers',
  'gacha.banner.ticket.blurb':
    'The common rite. Legendary steel is the prize, and it seldom answers — but the circle ' +
    'never sends you away with nothing.',
  'gacha.banner.lucky.name': 'Rite of the Fallen Star',
  'gacha.banner.lucky.blurb':
    'The rite worth saving for. Mythical is what it is chasing, and even a poor night here ' +
    'ends in Epic.',
  'gacha.held': 'You hold {count}',
  'gacha.pull': 'Perform the rite',
  'gacha.rates.title': 'Odds',
  'gacha.rates.total': 'Total',
  'gacha.rates.note.perPull':
    'Rates are per pull and never change. There is no pity counter — a pull is a pull.',
  'gacha.rates.note.always': 'Every pull pays something. No outcome here is empty.',
  'gacha.rates.note.bracket':
    'Everything the circle gives is sized to your Power Level, so nothing arrives too strong ' +
    'to have been earned.',
  'gacha.row.gear': '{rarity} gear',
  'gacha.row.materials': 'Crafting materials',
  'gacha.row.gold': 'A purse of gold',
  'gacha.refuse.noCurrency': 'The circle wants a {currency}. You have none.',
  'gacha.refuse.backpackFull':
    'Your backpack is full, and the circle will not conjure something you cannot carry. ' +
    'Sell or equip a piece first.',

  // The rite itself (§16.3) — one line per beat, spoken by the circle.
  'gacha.rite.charge': 'The circle wakes…',
  'gacha.rite.tease': 'Something is coming through.',
  'gacha.rite.almost': 'Closer…',
  'gacha.rite.break': 'It holds!',
  'gacha.rite.reveal.common': 'The circle answers.',
  'gacha.rite.reveal.rare': 'A worthy answer.',
  'gacha.rite.reveal.epic': 'The circle burns bright!',
  'gacha.rite.reveal.legendary': 'LEGENDARY!',
  'gacha.rite.reveal.mythic': 'MYTHICAL!',
  'gacha.rite.reveal.gold': 'A purse, heavy with coin.',
  'gacha.rite.reveal.materials': 'The circle yields its stone.',
  'gacha.rite.skip': 'Skip',
  'gacha.rite.again': 'Again',
  'gacha.rite.done': 'Take it',
  'gacha.rite.banked': 'Already in your backpack.',
  'gacha.rite.gold': '{gold} gold',
  'gacha.rite.materials': '{count} × {name}',

  // --- Account upgrades (Brief §15, Q19) ---
  'upgrades.title': 'Account Upgrades',
  'upgrades.subtitle': 'Bought once. They survive every reset (Q4).',
  'upgrades.battleSpeed': 'Battle Speed',
  'upgrades.battleSpeedDetail':
    'Fights play at x{rate}. Speed changes the animation, never the outcome.',
  'upgrades.battleSpeedNext': 'Raise to x{rate}',
  'upgrades.battleSpeedMax': 'Fights already play at x8.',
  'upgrades.slots': 'Account Slots',
  'upgrades.slotsDetail': '{unlocked} of {max} character slots unlocked.',
  'upgrades.slotsNext': 'Unlock slot {slot}',
  'upgrades.slotsMax': 'All five slots are yours.',
  'upgrades.buy': 'Buy',
  'upgrades.owned': 'Owned',
  'upgrades.cost': '{cost} gold',
  'upgrades.paidBy': 'Paid from {name}’s purse.',
  'upgrades.short': 'You are {missing} gold short.',

  // --- Tutorial (Brief §18) ---
  'tutorial.skip': 'Skip the tour',
  'tutorial.skipNudge': 'It takes a minute, and it ends with a Lucky Ticket.',
  'tutorial.next': 'Got it',
  'tutorial.finish': 'Begin the climb',
  'tutorial.take': 'Take it',
  'tutorial.step': 'Step {step} of {total}',
  'tutorial.welcome.title': 'The Lootspire',
  'tutorial.welcome.body':
    'One tower, no top. Every floor is a fight you watch rather than play, and every fight ' +
    'pays. The only question the game ever asks is whether you want one more floor. ' +
    'You can skip this tour — but it takes a minute, and it ends with a Lucky Ticket.',
  'tutorial.tower.title': 'Climb',
  'tutorial.tower.body':
    'The floor you are standing on is the fight. Beat it and the next one opens; every tenth ' +
    'floor is a boss that hits back harder and pays more.',
  'tutorial.death.title': 'Falling is part of it',
  'tutorial.death.body':
    'When the spire wins, you lose the climb and nothing else — level, gear, gold and your ' +
    'best-floor record all survive. Quick-Raid skips you back up through floors you have ' +
    'already beaten.',
  'tutorial.character.title': 'Grow',
  'tutorial.character.body':
    'Gold buys stat points; gold and materials upgrade the gear you find. Speed is the one ' +
    'stat you can never buy — it comes only from what you are wearing.',
  'tutorial.merchant.title': 'Spend',
  'tutorial.merchant.body':
    'Both merchants stock goods sized to your own power, and restock on their own every few ' +
    'hours. The Magic Merchant also pours draughts that last an hour.',
  'tutorial.quests.title': 'Come back tomorrow',
  'tutorial.quests.body':
    'Three daily quests and three weekly ones, scaled to how deep you are. The hard weekly is ' +
    'the one that pays in tickets.',
  'tutorial.reward.title': 'Take this with you',
  'tutorial.reward.body': 'A Lucky Ticket and some gold to start the climb with.',

  'gate.tooSmall.title': 'A little more room, adventurer',
  'gate.tooSmall.message':
    'OneMoreFloor is built for desktop screens. Widen the window to at least 1280 pixels to play.',
} as const;

export type StringKey = keyof typeof en;
