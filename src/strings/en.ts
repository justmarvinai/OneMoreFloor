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
  'save.status.corrupt':
    'Your save could not be verified and was left untouched so nothing is lost. ' +
    'Recovery from an earlier generation arrives with the next milestone.',

  'error.title': 'Something went wrong',
  'error.message': 'The game hit an error it could not recover from. Your save was not modified.',
  'error.detail': 'Details: {detail}',
  'error.reload': 'Reload the game',

  'gate.tooSmall.title': 'A little more room, adventurer',
  'gate.tooSmall.message':
    'OneMoreFloor is built for desktop screens. Widen the window to at least 1280 pixels to play.',
} as const;

export type StringKey = keyof typeof en;
