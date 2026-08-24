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
  'currency.echoes.what': 'Echo of the Spire',
  'currency.echoes.use':
    'Deepened on the Account screen, into bonuses every hero on this account is born with.',
  'currency.echoes.where':
    'Paid once for each floor the account has never cleared. Re-climbing earns none, ' +
    'and death takes none away.',

  'nav.hero.toCharacter': 'Open the character sheet',
  'nav.hero.here': 'You are looking at the character sheet',
  'nav.section.tower': 'Tower',
  'nav.section.character': 'Character',
  'nav.section.equipmentMerchant': 'Equipment',
  'nav.section.magicMerchant': 'Alchemist',
  'nav.section.quests': 'Quests',
  'nav.section.gacha': 'Summoning',
  'nav.section.records': 'Records',
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
  'tower.eliteFloor': 'Elite',
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
  'tower.eliteTip':
    'An elite stands here — the same creature, a head taller and carrying something extra. It always leaves gear behind.',
  'tower.preview.elite': 'Elite',
  'tower.preview.noEffects': 'No floor modifiers here',
  'tower.stat.strength': 'STR',
  'tower.stat.defense': 'DEF',
  'tower.stat.hp': 'HP',
  'tower.stat.speed': 'SPD',
  'tower.stat.luck': 'LCK',
  'tower.cleared': 'Cleared',
  // --- Records: run history and the bestiary ---
  'records.title': 'Records',
  'records.subtitle': 'What this hero has done, and what it cost.',
  'records.runs': 'Recent runs',
  'records.runsEmpty': 'No run has ended yet. The list fills the first time you fall.',
  'records.run.reached': 'Floor {floor}',
  'records.run.died': 'Fell on floor {floor} to {name}',
  'records.run.gold': '{gold} gold',
  'records.run.fights': '{fights} fights',
  'records.run.when': '{when}',
  'records.run.tip':
    'Reached floor {floor}, banked {gold} gold across {fights} fights, and ended on floor ' +
    '{died} against {name}.',
  'records.best': 'Best ever',
  'records.runsHint': 'The last {count} runs, newest first.',

  // Curses: enemy affixes the player switches on (Q35).
  'curse.title': 'Curses',
  'curse.hint':
    'Make every enemy in the Spire harder, and every floor pay more for it. Loot is still sized to you — a curse buys gold, experience and materials, never gear you have not earned.',
  'curse.locked': 'Curses open at level {level}. Climb.',
  'curse.lockedChip': 'Level {level}',
  'curse.full': 'Three at once is the limit. Switch one off to take another.',
  'curse.reward': '+{percent}% from every floor',
  'curse.active': '{count} of {max} active',
  'curse.on': 'Curse taken',
  'curse.off': 'Curse lifted',
  'curse.refused.notUnlocked': 'Not yet',
  'curse.refused.notUnlockedBody': 'Curses open at level {level}.',
  'curse.refused.tooMany': 'Three is the limit',
  'curse.refused.tooManyBody': 'Switch one off before taking another.',

  'curse.wrath': 'Wrath',
  'curse.wrath.desc': 'Everything in the Spire hits harder.',
  'curse.bulwark': 'Bulwark',
  'curse.bulwark.desc': 'Everything in the Spire turns more of your blow aside.',
  'curse.vigour': 'Vigour',
  'curse.vigour.desc': 'Everything in the Spire takes longer to put down.',
  'curse.swiftness': 'Swiftness',
  'curse.swiftness.desc': 'Everything in the Spire moves first more often.',
  'curse.cunning': 'Cunning',
  'curse.cunning.desc': 'Everything in the Spire lands the lucky blow more often.',
  'curse.dominion': 'Dominion',
  'curse.dominion.desc':
    'Everything in the Spire is greater in every way. The Spire pays most for this one.',

  // Echoes of the Spire — the permanent account tree (Q36).
  'echo.title': 'Echoes of the Spire',
  'echo.subtitle':
    'Paid for ground nobody has walked. Spent once, kept forever — no reset touches them.',
  'echo.held': '{count} unspent',
  'echo.earned': '{count} earned in all',
  'echo.rank': 'Rank {rank} of {max}',
  'echo.buy': 'Deepen',
  'echo.maxed': 'Fully deepened',
  'echo.cost': '{cost} echoes',
  'echo.short': '{missing} more echoes and this rank opens.',
  'echo.now': 'Now: {value}',
  'echo.next': 'Next rank: {value}',
  'echo.none': 'Nothing yet',
  'echo.percent': '+{percent}%',
  'echo.sockets': '+{count} sockets',
  'echo.refused.maxRank': 'Nothing deeper',
  'echo.refused.maxRankBody': 'This one is as deep as it goes.',
  'echo.refused.notEnough': 'Not enough echoes',
  'echo.refused.notEnoughBody': 'Echoes come from floors the account has never cleared. Climb.',

  // Deeds (Q40).
  'deed.climber': 'The Long Climb',
  'deed.climber.desc': 'Floors cleared, by every hero this account has ever owned.',
  'deed.gatebreaker': 'Gatebreaker',
  'deed.gatebreaker.desc':
    'Gates thrown down. Every tenth floor has one, and none of them go quietly.',
  'deed.deepest': 'High Water',
  'deed.deepest.desc':
    'The deepest floor anyone on this account has ever cleared. It only goes up.',
  'deed.rush': 'Ten Gates',
  'deed.rush.desc': 'Gates taken in a single Boss Rush, on one health bar.',
  'deed.fortune': 'A Spire-Keeper’s Fortune',
  'deed.fortune.desc':
    'Gold banked, lifetime. The Spire has a great deal of it and no use for any.',
  'deed.patron': 'Patron of the Landings',
  'deed.patron.desc':
    'Gold handed back to the Spire, lifetime. Somebody has to keep the merchants in business.',
  'deed.smith': 'The Smith',
  'deed.smith.desc': 'Levels bought into gear. Nothing you were given, and everything you made.',
  'deed.magpie': 'Magpie',
  'deed.magpie.desc':
    'Pieces bought from a counter, rather than pulled off something that objected.',
  'deed.apothecary': 'The Apothecary',
  'deed.apothecary.desc': 'Draughts drunk. Not one of them lasted, and every one of them helped.',
  'deed.title': 'Deeds',
  'deed.subtitle': 'What this account has done, and what it is owed for it.',
  'deed.tier': 'Tier {tier} of {max}',
  'deed.progress': '{have} / {need}',
  'deed.done': 'Done',
  'deed.claim': 'Claim',
  'deed.claimed': 'Claimed',
  'deed.allClaimed': 'Every tier claimed',
  'deed.locked': 'Tier {tier} at {need}',
  'deed.pays': 'Pays about {gold} gold and {materials} materials',
  'deed.paysTicket': 'Pays about {gold} gold, {materials} materials and a summoning ticket',
  'deed.claimedToast': '{name} — tier {tier}',
  'deed.claimedBody': 'The Spire settles up. Its spoils are in your purse and your pack.',
  'deed.refused.unknown': 'No such deed',
  'deed.refused.unknownBody': 'Nothing by that name is on the ledger.',
  'deed.refused.notEarned': 'Not done yet',
  'deed.refused.notEarnedBody': 'The tier has to be reached before it can be claimed.',
  'deed.refused.alreadyClaimed': 'Already settled',
  'deed.refused.alreadyClaimedBody': 'That tier has been paid once. It does not pay twice.',

  // Branching paths (Q41).
  'path.evenRoad': 'The Even Road',
  'path.evenRoad.desc':
    'The way the Spire was built. Nothing waits for you here that was not already coming.',
  'path.sheerFace': 'The Sheer Face',
  'path.sheerFace.desc':
    'Up the outside. Everything on this stretch is bigger than it should be, and everything on it is carrying more.',
  'path.vaults': 'The Vaults',
  'path.vaults.desc':
    'Through the counting-rooms. Whoever kept the ledgers left in a hurry, and the Spire has learned nothing new to teach you down here.',
  'path.reliquary': 'The Reliquary',
  'path.reliquary.desc':
    'The shelves where the Spire keeps what it has broken. Little coin, and everything you need to mend what you are carrying.',
  'path.gauntlet': 'The Gauntlet',
  'path.gauntlet.desc':
    'A landing the champions have claimed. Half of what you meet is one of theirs, and every one of them is carrying something.',
  'path.quietWay': 'The Quiet Way',
  'path.quietWay.desc':
    'The service stair. Less waiting for you, and less left behind — but the ten floors go by, and you are still standing at the end of them.',
  'path.forkTitle': 'The road forks',
  'path.forkBody': 'Floors {from} to {to}. Choose once; it holds for the whole stretch.',
  'path.take': 'Take this road',
  'path.taken': 'Walking: {name}',
  'path.until': 'Until floor {floor}',
  'path.danger': 'Enemies {percent}',
  'path.dangerEven': 'Enemies as the Spire built them',
  'path.spoils': 'Gold {gold}, experience {xp}, materials {materials}',
  'path.elites': 'Champions on {percent} more of it',
  'path.stronger': '+{percent}% stronger',
  'path.weaker': '{percent}% weaker',
  'path.up': '+{percent}%',
  'path.down': '−{percent}%',
  'path.same': 'unchanged',
  'path.mustChoose': 'Choose a road before you climb',
  'path.refused.unknown': 'No such road',
  'path.refused.unknownBody': 'Nothing by that name is on this fork.',
  'path.refused.notOffered': 'That road is not on this fork',
  'path.refused.notOfferedBody': 'The Spire offers three at a time. Choose one of them.',
  'path.refused.alreadyChosen': 'You are already on a road',
  'path.refused.alreadyChosenBody': 'The choice holds until the next gate. Climb.',
  'path.refused.noChoice': 'The road forks first',
  'path.refused.noChoiceBody': 'Choose which way the next ten floors go, then climb.',

  // The Boss Rush (Q39).
  'rush.title': 'Boss Rush',
  'rush.enter': 'Boss Rush',
  'rush.subtitle': 'Ten gates. One health bar. No second chances.',
  'rush.card':
    'The ten gates, back to back, on whatever is left of you. Nothing here touches your climb — you cannot lose the run, and you cannot lose a floor.',
  'rush.best': 'Best: {count} of {max}',
  'rush.bestNone': 'Never attempted',
  'rush.locked': 'Opens once you have beaten the gate on floor {floor}',
  'rush.gate': 'Gate {index}',
  'rush.gateFloor': 'Floor {floor}',
  'rush.held': 'Held',
  'rush.fell': 'Fell here',
  'rush.untouched': 'Never reached',
  'rush.resultTitle': '{count} of {max} gates',
  'rush.resultRecord': 'A new best — {count} of {max}',
  'rush.resultNone': 'The first gate held',
  'rush.resultAll': 'Every gate, in one breath',
  'rush.subtitleRecord':
    'Further than anyone on this account has gone. The chest is for the new ground alone.',
  'rush.subtitleTied':
    'The same depth as your best. The Spire pays for getting further, and nothing else.',
  'rush.subtitleShort': 'Short of your best of {best}. Nothing owed, and nothing lost.',
  'rush.close': 'Back to the Spire',
  'rush.cleared': 'Gates cleared',
  'rush.healthLeft': 'Health left',
  'rush.refused.tooDeep': 'No gates to rush yet',
  'rush.refused.tooDeepBody':
    'Beat the gate on floor 10 first. There is nothing to run until then.',

  // Expeditions (Q37).
  'expedition.scavenge': 'Scavenging Run',
  'expedition.scavenge.desc':
    'Two hours on the lower landings, turning over what the last climbers left behind. Mostly coin, and mostly small.',
  'expedition.survey': 'Survey of the Stair',
  'expedition.survey.desc':
    'Somebody has to write down which steps give way. The party comes back with less in their packs than in their notes.',
  'expedition.quarry': 'Quarry Detail',
  'expedition.quarry.desc':
    'Down to where the Spire is still raw stone, with picks. Hard work, and the only thing they bring back is what ascension eats.',
  'expedition.pilgrimage': 'Pilgrimage',
  'expedition.pilgrimage.desc':
    'A slow walk to a shrine nobody has found twice. They carry little and look for one thing: a rite worth performing.',
  'expedition.reclaim': 'Reclamation March',
  'expedition.reclaim.desc':
    'Twelve hours retaking a landing that was taken from you. Everything the Spire owes, in equal measure.',
  'expedition.descent': 'The Long Descent',
  'expedition.descent.desc':
    'A full day down a route the Spire does not advertise. Only send them if you already know how deep it goes.',
  'expedition.title': 'Expeditions',
  'expedition.subtitle': 'Send a party out. Come back to what they found.',
  'expedition.slot': 'Party {index}',
  'expedition.idle': 'Waiting for orders',
  'expedition.away': 'Away · {time} left',
  'expedition.ready': 'Back, and carrying something',
  'expedition.send': 'Send',
  'expedition.claim': 'Take the spoils',
  'expedition.recall': 'Recall',
  'expedition.recallTitle': 'Call them back?',
  'expedition.recallBody':
    'They are {time} from being done. Recalling them now brings the party home with nothing.',
  'expedition.recallConfirm': 'Call them back',
  'expedition.recallCancel': 'Let them finish',
  'expedition.hours': '{hours}h',
  'expedition.pays': 'About {gold} gold, {xp} xp, {materials} materials',
  'expedition.paysTickets': 'and looks for a summoning ticket',
  'expedition.paysNoTickets': 'and will not find a ticket on this route',
  'expedition.locked': 'Opens once the Spire has been climbed to floor {floor}',
  'expedition.noSlots': 'No party free',
  'expedition.noSlotsBody':
    'Every party is out. More open with every character slot the account buys.',
  'expedition.claimed': 'The party is back',
  'expedition.claimedBody': 'Their spoils are in your purse and your pack.',
  'expedition.recalled': 'Party recalled',
  'expedition.recalledBody': 'They came home empty-handed, and the slot is free again.',
  'expedition.sent': '{name} is under way',
  'expedition.sentBody':
    'They will be back in {time}. The Spire does not wait for them, and neither should you.',
  'expedition.refused.notReady': 'They are not back yet',
  'expedition.refused.notReadyBody': 'Give them the time they were sent for.',
  'expedition.refused.slotBusy': 'That party is already out',
  'expedition.refused.slotBusyBody': 'Wait for them, or recall them and lose what they carry.',
  'expedition.refused.noSlot': 'No party there',
  'expedition.refused.noSlotBody': 'That slot is not one the account has opened.',
  'expedition.refused.tooDeep': 'Nobody knows that route',
  'expedition.refused.tooDeepBody': 'Climb further, and someone will.',
  'expedition.refused.noSuch': 'No such expedition',
  'expedition.refused.noSuchBody': 'Nothing by that name is on the board.',
  'expedition.refused.empty': 'Nobody is out',
  'expedition.refused.emptyBody': 'There is nothing to call back.',

  // Companions (Q42).
  'pet.emberling': 'Emberling',
  'pet.emberling.desc':
    'A knot of live coal that decided to follow you. It has no plan beyond setting things on fire, and it is very good at it.',
  'pet.emberling.aura': 'Emberling’s Heat',
  'pet.stoneWhelp': 'Stone Whelp',
  'pet.stoneWhelp.desc':
    'Hatched from something that was not an egg. It puts itself between you and whatever is coming, every single time, and it is heavy enough to matter.',
  'pet.stoneWhelp.aura': 'Whelp’s Bulwark',
  'pet.spireOwl': 'Spire Owl',
  'pet.spireOwl.desc':
    'It has been watching the Spire longer than you have. Nothing catches it, and it sees the opening a half-second before you do.',
  'pet.spireOwl.aura': 'Owl’s Sight',
  'pet.graveMoth': 'Grave Moth',
  'pet.graveMoth.desc':
    'Drawn to the lanterns on the deep landings. Wherever it settles, blows land a little softer — nobody has worked out why.',
  'pet.graveMoth.aura': 'Moth’s Hush',
  'pet.cinderHound': 'Cinder Hound',
  'pet.cinderHound.desc':
    'What the Emberling grows into if it survives long enough. It hunts ahead of you, and the room is warmer for it.',
  'pet.cinderHound.aura': 'Hound’s Fury',
  'pet.lanternWisp': 'Lantern Wisp',
  'pet.lanternWisp.desc':
    'A light that stayed after whoever carried it did not. It barely fights. It makes the moment you have been charging towards arrive sooner.',
  'pet.lanternWisp.aura': 'Wisp’s Gift',
  'pet.title': 'Companions',
  'pet.none': 'No companion',
  'pet.noneDesc': 'Climb, and the Spire will send something after you.',
  'pet.noneFound': 'Nothing has followed you yet',
  'pet.noneFoundBody': 'The first companion turns up on floor {floor}.',
  'pet.level': 'Level {level} of {max}',
  'pet.xp': '{xp} / {next} xp',
  'pet.maxed': 'Fully grown',
  'pet.send': 'Send out',
  'pet.recall': 'Call back',
  'pet.out': 'Out with you',
  'pet.aura': 'Aura: {effect}',
  'pet.auraStat': '+{percent}% {stat}',
  'pet.auraReduction': '{percent}% of every blow turned aside',
  'pet.taunt': 'Draws {percent}% of what comes at you',
  'pet.share': 'Fights at {percent}% of your own numbers',
  'pet.found': '{name} is following you',
  'pet.foundBody': 'It waits on the character sheet. Only one goes out at a time.',
  'pet.grew': '{name} reached level {level}',
  'pet.refused.noSuchPet': 'No such companion',
  'pet.refused.noSuchPetBody': 'Nothing by that name has ever followed anyone.',
  'pet.refused.notFound': 'You have not met that one',
  'pet.refused.notFoundBody': 'Companions turn up as the Spire is climbed. Keep going.',
  'combat.log.petJoins': '{unit} steps in beside you.',
  'combat.log.petDown': '{unit} goes down.',
  'combat.pet': 'Companion',

  // The talents screen (Q38).
  'talent.title': 'The {class}\u2019s Talents',
  'talent.subtitle': 'One point a level, and a long way down.',
  'talent.available': 'Points',
  'talent.spent': 'Committed',
  'talent.earned': '{count} earned in all',
  'talent.rank': 'Rank {rank} of {max}',
  'talent.tier': 'Row {tier}',
  'talent.tierOpen': '{cost} per rank',
  'talent.tierClosed': 'Opens at {points} points committed',
  'talent.tierShort': '{missing} more points committed and this row opens.',
  'talent.pointsShort': '{missing} more points and this rank opens.',
  'talent.learn': 'Learn \u00b7 {cost}',
  'talent.cost': '{cost} points',
  'talent.maxed': 'Fully learned',
  'talent.now': 'Now: {value}',
  'talent.next': 'Next rank: {value}',
  'talent.none': 'Nothing yet',
  'talent.value.stat': '+{percent}% {stat}',
  'talent.value.percent': '+{percent}%',
  'talent.value.reduction': '{percent}% of every blow turned aside',
  'talent.value.regeneration': '{percent}% of your health each round',
  'talent.respec': 'Unlearn all \u00b7 {cost}g',
  'talent.respecNone': 'Nothing learned yet',
  'talent.respecNoneBody': 'There is nothing to unlearn. Spend a point first.',
  'talent.respecTitle': 'Unlearn everything?',
  'talent.respecBody':
    'Every talent is forgotten and {points} points come back to spend again. It costs {cost} gold, and the gold does not come back.',
  'talent.respecCost': '{cost} gold',
  'talent.respecConfirm': 'Unlearn \u00b7 {cost}g',
  'talent.respecCancel': 'Keep them',
  'talent.respecShort': '{missing} more gold and you could unlearn them.',
  'talent.respecDone': 'Talents unlearned',
  'talent.respecDoneBody': 'Every point is back in your hands.',
  'talent.refused.points': 'Not enough points',
  'talent.refused.pointsBody': 'Talent points come one per level. Climb.',
  'talent.refused.tier': 'That row is not open',
  'talent.refused.tierBody': 'Commit more points in the rows above it first.',
  'talent.refused.none': 'Nothing to unlearn',
  'talent.refused.noneBody': 'This hero has not spent a point yet.',
  'nav.section.talents': 'Talents',

  // What names a heal the tree paid for, in the combat log.
  'talent.regeneration': 'Regeneration',

  // The Warrior's tree (Q38).
  'talent.warrior.brawn': 'Brawn',
  'talent.warrior.brawn.desc':
    'Years of swinging something heavy. Adds to everything Strength already gives you.',
  'talent.warrior.thickHide': 'Thick Hide',
  'talent.warrior.thickHide.desc': 'Scar over scar. Adds to the Defense you already carry.',
  'talent.warrior.deepLungs': 'Deep Lungs',
  'talent.warrior.deepLungs.desc':
    'One more round in you than the fight expected. Adds to your health pool.',
  'talent.warrior.ironSkin': 'Iron Skin',
  'talent.warrior.ironSkin.desc': 'A share of every blow simply fails to land properly.',
  'talent.warrior.rageBorn': 'Rage-Born',
  'talent.warrior.rageBorn.desc':
    'Anger arrives sooner. Rage fills faster from both giving and taking.',
  'talent.warrior.spoilsOfWar': 'Spoils of War',
  'talent.warrior.spoilsOfWar.desc':
    'You go through their pockets afterwards. Every floor pays more gold.',
  'talent.warrior.secondWind': 'Second Wind',
  'talent.warrior.secondWind.desc':
    'You close up between exchanges. Recover health at the end of each round.',
  'talent.warrior.cleavingBlows': 'Cleaving Blows',
  'talent.warrior.cleavingBlows.desc':
    'When one lands right, it lands all the way through. Critical hits hurt more.',
  'talent.warrior.scavenger': 'Scavenger',
  'talent.warrior.scavenger.desc':
    'Nothing usable gets left on the floor. Every floor gives up more materials.',
  'talent.warrior.unbreakable': 'Unbreakable',
  'talent.warrior.unbreakable.desc':
    'The blow that should have ended it does not. A further share of all damage turned aside.',
  'talent.warrior.warCry': 'War Cry',
  'talent.warrior.warCry.desc':
    'The bar empties into something the room hears. Berserk Strike and Shield Slam hit harder.',

  // The Mage's tree (Q38).
  'talent.mage.arcaneFocus': 'Arcane Focus',
  'talent.mage.arcaneFocus.desc':
    'Intent sharpened to a point. Adds to the Strength your spells are cut from.',
  'talent.mage.deepWell': 'Deep Well',
  'talent.mage.deepWell.desc':
    'More to draw on before you have to stop. Adds to your resource pool.',
  'talent.mage.wardingSigil': 'Warding Sigil',
  'talent.mage.wardingSigil.desc':
    'A sign held in the off hand. Adds to the Defense you already carry.',
  'talent.mage.quickenedCasting': 'Quickened Casting',
  'talent.mage.quickenedCasting.desc': 'The words come shorter. Mana gathers faster each round.',
  'talent.mage.runicInsight': 'Runic Insight',
  'talent.mage.runicInsight.desc':
    'You read the tower as well as fight it. Every floor teaches more.',
  'talent.mage.manaShield': 'Mana Shield',
  'talent.mage.manaShield.desc':
    'A thin skin of held power. A share of every blow is absorbed before it reaches you.',
  'talent.mage.overchannel': 'Overchannel',
  'talent.mage.overchannel.desc':
    'More through the same channel than is strictly wise. Arcane Blast hits harder.',
  'talent.mage.elementalFury': 'Elemental Fury',
  'talent.mage.elementalFury.desc':
    'When it goes right it goes very right. Critical hits hurt more.',
  'talent.mage.transmuterEye': "Transmuter's Eye",
  'talent.mage.transmuterEye.desc':
    'You see what a thing could become. Every floor gives up more materials.',
  'talent.mage.archmage': 'Archmage',
  'talent.mage.archmage.desc':
    'The title is not honorary. A further, large increase to Arcane Blast.',
  'talent.mage.leylineTap': 'Leyline Tap',
  'talent.mage.leylineTap.desc': 'Something under the Spire answers. Mana gathers faster still.',

  // The Hunter's tree (Q38).
  'talent.hunter.steadyHands': 'Steady Hands',
  'talent.hunter.steadyHands.desc':
    'The draw does not waver. Adds to the Strength behind every shot.',
  'talent.hunter.keenEye': 'Keen Eye',
  'talent.hunter.keenEye.desc': 'You see the gap before it opens. Adds to your Luck.',
  'talent.hunter.endurance': 'Endurance',
  'talent.hunter.endurance.desc':
    'Days in the field teach a body to keep going. Adds to your health pool.',
  'talent.hunter.killerInstinct': 'Killer Instinct',
  'talent.hunter.killerInstinct.desc': 'You know where it hurts. Critical hits deal more damage.',
  'talent.hunter.trophyHunter': 'Trophy Hunter',
  'talent.hunter.trophyHunter.desc':
    'Everything worth carrying gets carried. Every floor pays more gold.',
  'talent.hunter.bracing': 'Bracing',
  'talent.hunter.bracing.desc':
    'You take it on the shoulder, not the ribs. A share of every blow turned aside.',
  'talent.hunter.rapidNocking': 'Rapid Nocking',
  'talent.hunter.rapidNocking.desc':
    'The next arrow is already moving. Focus gathers faster from every hit.',
  'talent.hunter.fieldDressing': 'Field Dressing',
  'talent.hunter.fieldDressing.desc':
    'Nothing usable is wasted. Every floor gives up more materials.',
  'talent.hunter.huntersMark': "Hunter's Mark",
  'talent.hunter.huntersMark.desc':
    'You pick the spot before you loose. Piercing Volley hits harder.',
  'talent.hunter.deadeye': 'Deadeye',
  'talent.hunter.deadeye.desc':
    'The shot that counts, counts double. A further, large increase to critical damage.',
  'talent.hunter.volleyMaster': 'Volley Master',
  'talent.hunter.volleyMaster.desc':
    'Four arrows in the air at once, and all of them yours. A further increase to Piercing Volley.',

  // The Bard's tree (Q38).
  'talent.bard.silverTongue': 'Silver Tongue',
  'talent.bard.silverTongue.desc': 'Fortune likes to be flattered. Adds to your Luck.',
  'talent.bard.resonance': 'Resonance',
  'talent.bard.resonance.desc': 'The note hangs longer than it should. Adds to your resource pool.',
  'talent.bard.poise': 'Poise',
  'talent.bard.poise.desc': 'A performer does not flinch. Adds to the Defense you already carry.',
  'talent.bard.encore': 'Encore',
  'talent.bard.encore.desc': 'They always want another. Inspiration gathers faster each round.',
  'talent.bard.patronsPurse': "Patron's Purse",
  'talent.bard.patronsPurse.desc':
    'Somebody always pays for a good story. Every floor pays more gold.',
  'talent.bard.balladOfVigour': 'Ballad of Vigour',
  'talent.bard.balladOfVigour.desc':
    'You sing yourself upright. Recover health at the end of each round.',
  'talent.bard.risingCrescendo': 'Rising Crescendo',
  'talent.bard.risingCrescendo.desc':
    'The song builds to something worth waiting for. Crescendo hits harder.',
  'talent.bard.sharpWit': 'Sharp Wit',
  'talent.bard.sharpWit.desc': 'The line that lands, lands hard. Critical hits deal more damage.',
  'talent.bard.curioCollector': 'Curio Collector',
  'talent.bard.curioCollector.desc': 'You keep the odd bits. Every floor gives up more materials.',
  'talent.bard.maestro': 'Maestro',
  'talent.bard.maestro.desc':
    'Nobody in the Spire plays it better. A further, large increase to Crescendo.',
  'talent.bard.everlastingSong': 'Everlasting Song',
  'talent.bard.everlastingSong.desc': 'It never quite stops. Inspiration gathers faster still.',

  // The Swashbuckler's tree (Q38).
  'talent.swashbuckler.sinewAndSpring': 'Sinew and Spring',
  'talent.swashbuckler.sinewAndSpring.desc':
    'Light, and stronger than light looks. Adds to your Strength.',
  'talent.swashbuckler.fortunesFavour': "Fortune's Favour",
  'talent.swashbuckler.fortunesFavour.desc':
    'You have always been lucky, and you have always known it. Adds to your Luck.',
  'talent.swashbuckler.windRead': 'Wind-Read',
  'talent.swashbuckler.windRead.desc':
    'You know which way the fight is leaning. Adds to your resource pool.',
  'talent.swashbuckler.riposte': 'Riposte',
  'talent.swashbuckler.riposte.desc':
    'Their blade goes where you are not. A share of every blow turned aside.',
  'talent.swashbuckler.pickpocket': 'Pickpocket',
  'talent.swashbuckler.pickpocket.desc':
    'You were closer to them than they realised. Every floor pays more gold.',
  'talent.swashbuckler.duellistsRhythm': "Duellist's Rhythm",
  'talent.swashbuckler.duellistsRhythm.desc': 'Step, feint, step. Focus gathers faster each round.',
  'talent.swashbuckler.precision': 'Precision',
  'talent.swashbuckler.precision.desc':
    'One inch left and it would have been nothing. Critical hits deal more damage.',
  'talent.swashbuckler.quickStudy': 'Quick Study',
  'talent.swashbuckler.quickStudy.desc':
    'You only need to be shown once. Every floor teaches more.',
  'talent.swashbuckler.feintingFlurry': 'Feinting Flurry',
  'talent.swashbuckler.feintingFlurry.desc':
    'Three blades where there is one. Flurry and Feint hits harder.',
  'talent.swashbuckler.bladeDance': 'Blade Dance',
  'talent.swashbuckler.bladeDance.desc':
    'It stops looking like fighting. A further, large increase to Flurry and Feint.',
  'talent.swashbuckler.devilsOwnLuck': "Devil's Own Luck",
  'talent.swashbuckler.devilsOwnLuck.desc':
    'The kind nobody should have. A further, large increase to critical damage.',
  'echo.spoils': 'Spoils',
  'echo.spoils.desc': 'Every floor hands over more gold.',
  'echo.insight': 'Insight',
  'echo.insight.desc': 'Every floor teaches more.',
  'echo.prospect': 'Prospect',
  'echo.prospect.desc': 'Every floor gives up more of what it is made of.',
  'echo.fortune': "Fortune's Eye",
  'echo.fortune.desc': 'Tickets turn up more often on the way up.',
  'echo.patience': 'Patience',
  'echo.patience.desc': 'The auto-climb waits less between floors.',
  'echo.coffers': 'Coffers',
  'echo.coffers.desc': 'More sockets in every backpack this account owns.',

  // Sets and named uniques (Q45).
  'set.ironbound': 'Ironbound',
  'set.ironbound.desc': 'Plate meant for a wall that does not move.',
  'set.emberflow': 'Emberflow',
  'set.emberflow.desc': 'Forged hot and never allowed to cool.',
  'set.whisperstep': 'Whisperstep',
  'set.whisperstep.desc': 'Made for those who would rather not be hit at all.',
  'set.progress': '{worn} of {total} worn',
  'set.bonusActive': '{pieces} pieces: +{percent}% {stat}',
  'set.bonusIdle': '{pieces} pieces: +{percent}% {stat} — {missing} to go',
  'set.title': 'Sets',
  'set.none': 'Nothing you are wearing belongs to a set yet.',
  'set.tip': 'Part of the {name} set. {worn} of {total} pieces worn.',

  'item.set.ironboundHelm': 'Ironbound Helm',
  'item.set.ironboundCuirass': 'Ironbound Cuirass',
  'item.set.ironboundGreaves': 'Ironbound Greaves',
  'item.set.ironboundSabatons': 'Ironbound Sabatons',
  'item.set.ironboundFists': 'Ironbound Fists',
  'item.set.ironboundDrape': 'Ironbound Drape',
  'item.set.emberflowCrown': 'Emberflow Crown',
  'item.set.emberflowPlate': 'Emberflow Plate',
  'item.set.emberflowLegguards': 'Emberflow Legguards',
  'item.set.emberflowTreads': 'Emberflow Treads',
  'item.set.emberflowGrips': 'Emberflow Grips',
  'item.set.emberflowMantle': 'Emberflow Mantle',
  'item.set.whisperstepHood': 'Whisperstep Hood',
  'item.set.whisperstepJerkin': 'Whisperstep Jerkin',
  'item.set.whisperstepWraps': 'Whisperstep Wraps',
  'item.set.whisperstepStriders': 'Whisperstep Striders',
  'item.set.whisperstepGloves': 'Whisperstep Gloves',
  'item.set.whisperstepShroud': 'Whisperstep Shroud',

  'item.unique.heartOfEmber': 'Heart of Ember',
  'item.unique.stonewardPlate': 'Stoneward Plate',
  'item.unique.brambleMantle': 'Bramble Mantle',
  'item.unique.quickeningBand': 'Quickening Band',
  'item.unique.eyeOfTheSpire': 'Eye of the Spire',

  'item.uniqueLine': 'Unique',
  'unique.power.swiftCharge': 'Quickening',
  'unique.power.swiftCharge.desc': 'Your signature charges {percent}% faster.',
  'unique.power.lifesteal': 'Emberdrinker',
  'unique.power.lifesteal.desc': 'You heal for {percent}% of the damage you deal.',
  'unique.power.bulwark': 'Stoneward',
  'unique.power.bulwark.desc': 'You take {percent}% less damage from everything.',
  'unique.power.deadlyCrits': 'Spirekeen',
  'unique.power.deadlyCrits.desc': 'Your critical hits land for {percent}% more.',
  'unique.power.thorns': 'Bramblehide',
  'unique.power.thorns.desc': '{percent}% of the damage you take goes back to whoever dealt it.',

  // The workbench, at the Alchemist's counter (Q43).
  'bench.title': 'Workbench',
  'bench.hint':
    'Materials you have climbed past are not dead weight. Five of a kind become one of the next kind, and a pouch can pay for a draught when the purse cannot.',
  'bench.from': '{count} × {name}',
  'bench.to': '{count} × {name}',
  'bench.held': '{held} held',
  'bench.make': 'Make',
  'bench.makeAll': 'All',
  'bench.makeTip': 'Melt five down into one {name}.',
  'bench.makeAllTip': 'Do it {count} times over, in one press.',
  'bench.short': '{count} more and this rung opens.',
  'bench.brew': 'Brew a draught — {count} × {name}',
  'bench.brewCost': 'Costs {count} × {name}',
  'bench.brewShort': 'Not enough of the material this depth asks for.',
  'bench.brewed': 'Brewed and drunk',
  'bench.made': 'Made {count} × {name}',
  'bench.refused.atCeiling': 'Nothing above it',
  'bench.refused.atCeilingBody':
    'This is the deepest material the Spire has. There is no rung above.',

  // The summoning wish list.
  'gacha.wish.title': 'Wish list',
  'gacha.wish.hint':
    'Aim the gear the rites hand over at one socket. It changes where a prize lands, never how likely one is — the rates above stay exactly as printed.',
  'gacha.wish.none': 'No wish',
  'gacha.wish.noneTip': 'Let the rites give whatever they like.',
  'gacha.wish.tip': 'Gear from a rite arrives as {slot}, when the depth has one to give.',
  'gacha.wish.locked': '{slot} is not open on this hero yet. Ascend to unlock it.',
  'gacha.wish.set': 'Wishing for {slot}',
  'gacha.wish.cleared': 'Wish cleared',

  // Saved gear sets, on the Character screen.
  'loadout.title': 'Saved sets',
  'loadout.wear': 'Wear',
  'loadout.save': 'Save',
  'loadout.namePlaceholder': 'Set {index}',
  'loadout.empty': 'Empty',
  'loadout.holds': '{count} pieces',
  'loadout.wearEmpty': 'Nothing is saved here yet. Press Save to keep what you are wearing.',
  'loadout.wearTip': 'Put these {count} pieces back on. Anything they replace goes to the pack.',
  'loadout.saveTip': 'Keep what you are wearing right now, under the name in the field.',
  'loadout.saveOverTip': 'Replace this set with what you are wearing right now.',
  'loadout.saved': 'Set saved',
  'loadout.savedBody': 'What you are wearing is kept here until you save over it.',
  'loadout.worn': 'Set worn',
  'loadout.wornMissing': '{count} of its pieces are gone, so their sockets stayed as they were.',
  'loadout.refused.nothingWorn': 'Nothing to save',
  'loadout.refused.nothingWornBody': 'The hero is wearing nothing, so there is no set to keep.',
  'loadout.refused.empty': 'Nothing saved here',
  'loadout.refused.emptyBody': 'Press Save first, and this set will have something to put back on.',
  'loadout.refused.alreadyWorn': 'Already wearing it',
  'loadout.refused.alreadyWornBody': 'Every piece in this set is already on the hero.',
  'loadout.refused.backpackFull': 'No room to swap',
  'loadout.refused.backpackFullBody':
    'What this set takes off has nowhere to go. Sell something, or buy more sockets.',

  // The bestiary: what the account has met, and what it has not.
  'bestiary.title': 'Bestiary',
  'bestiary.hint': '{seen} of {total} met. What the account has seen stays seen.',
  'bestiary.unknown': '?????',
  'bestiary.unknownTip':
    'Nothing has met this one yet. Climb to floors {from}–{to} and it will name itself.',
  'bestiary.unknownTipOpen': 'Nothing has met this one yet. It waits from floor {from} upward.',
  'bestiary.killsLabel': 'slain',
  'bestiary.floors': 'Floors {from}–{to}',
  'bestiary.floorsOpen': 'Floor {from} and above',
  'bestiary.floorsLabel': 'Found on',
  'bestiary.boss': 'Gatekeeper',
  'bestiary.slain': 'Slain',
  'bestiary.inflicts': 'Inflicts',

  // Enemy families, named for the first time by the bestiary.
  'family.vermin': 'Vermin',
  'family.brigand': 'Brigands',
  'family.beast': 'Beasts',
  'family.construct': 'Constructs',
  'family.arcane': 'Arcane',
  'family.undead': 'Undead',
  'family.infernal': 'Infernal',
  'family.aberration': 'Aberrations',

  // --- Auto-climb (Q32) ---
  'tower.auto.label': 'Auto-climb',
  'tower.auto.off': 'Off',
  'tower.auto.watching': 'Watching',
  'tower.auto.background': 'In the background',
  'tower.auto.offTip':
    'You press the button. Every floor, exactly as the tower was built to be climbed.',
  'tower.auto.watchingTip':
    'Climbs a floor every {seconds} seconds while this screen is open, and stops the moment you ' +
    'die or walk away. Deliberately slower than climbing it yourself.',
  'tower.auto.backgroundTip':
    'Keeps climbing wherever you are in the game, one floor every {seconds} seconds, resolving ' +
    'each fight without showing it. Stops on a death.',
  'tower.auto.lockedTip': 'Background climbing opens at level {level}.',
  'tower.auto.on': 'Auto-climb is on — next floor in about {seconds}s.',
  'tower.auto.cleared': 'Auto-climb cleared floor {floor}',
  'tower.auto.died': 'Auto-climb stopped — {name} fell on floor {floor}',
  // --- Milestones ---
  'tower.milestone.node': 'Milestone',
  'tower.milestone.tip':
    'Every {every} floors pays a chest the first time you ever clear it — gold, materials and a ' +
    'ticket. Once per record, never again on the way back up.',
  'tower.milestone.claimed': 'Milestone taken',
  'tower.milestone.toast': 'Milestone — floor {floor}',
  'tower.milestone.body': 'A chest for the depth, not for the fight.',
  'tower.ghost': 'Your record',
  'tower.ghostTip':
    'The deepest floor you have ever cleared: {floor}. Everything above it is new ground.',

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
  'combat.log.heal': 'draws {amount} back — {power}',
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
  'item.salvage': 'Salvage',
  'item.salvageHint': 'Break it down for materials instead of gold',
  'item.salvageFlavor': 'Gone for good, like a sale — but the pieces feed what you are building.',
  'item.salvaged': 'Broken down',
  'item.salvagedBody': '{name} is gone. What it was made of is in the pouch.',
  'item.reforge': 'Reforge',
  'item.reforgeFrom': 'These lines',
  'item.reforgeTo': 'New ones',
  'item.reforged': 'Reforged',
  'item.reforgedBody': '{name} carries different lines now.',
  'item.reforgeShort': 'Not enough to reforge',
  'item.reforgeShortBody':
    'A reroll costs gold and the materials of the depth the piece came from.',
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
  'upgrades.backpack': 'Backpack',
  'upgrades.backpackDetail': '{slots} of {max} backpack sockets.',
  'upgrades.backpackNext': 'Widen the pack to {slots} sockets',
  'upgrades.backpackMax': 'The pack holds as much as it ever will.',
  'upgrades.backpackBought': '{slots} of {max} backpack sockets.',
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
