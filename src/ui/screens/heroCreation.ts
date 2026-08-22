/**
 * Hero creation — naming the hero *is* the account (Brief §5).
 *
 * The five classes are shown with what actually distinguishes them: their
 * resource, their signature move, their weapon loadout, and the honest downside
 * in the description. A class the player cannot tell apart from another is a
 * class that failed Brief §8.
 *
 * Name validation runs as the player types, so the rules are discovered by
 * trying rather than by being refused at the end (Q25).
 */
import { Button, CharacterCreator, h } from '@/ui/fui/index.ts';
import type { CreatorClass, FuiComponent } from '@/ui/fui/index.ts';
import { CLASS_LIST } from '@/content/classes/index.ts';
import type { Screen } from '@/app/router.ts';
import type { AppStore } from '@/app/state.ts';
import { takenNames } from '@/app/state.ts';
import { checkName, type NameProblem } from '@/domain/character/naming.ts';
import type { ClassId } from '@/domain/character/types.ts';
import { t, type StringKey } from '@/strings/index.ts';

export interface HeroCreationScreenOptions {
  store: AppStore;
  onCreate: (input: { name: string; classId: ClassId }) => void;
  onCancel: () => void;
}

const PROBLEM_STRINGS: Record<NameProblem, StringKey> = {
  empty: 'create.name.error.empty',
  tooShort: 'create.name.error.tooShort',
  tooLong: 'create.name.error.tooLong',
  illegalCharacters: 'create.name.error.illegalCharacters',
  noLetter: 'create.name.error.noLetter',
  duplicate: 'create.name.error.duplicate',
};

/** Stat bars on the class card, scaled so the five classes are comparable. */
function statBars(classId: ClassId): Record<string, number> {
  const definition = CLASS_LIST.find((entry) => entry.id === classId);
  if (!definition) return {};
  const { baseStats } = definition;
  // Drawn 0–5; the divisors put each stat's realistic range across the bar.
  return {
    [t('stat.strength')]: Math.round(baseStats.strength / 3),
    [t('stat.defense')]: Math.round(baseStats.defense / 3),
    [t('stat.hp')]: Math.round(baseStats.hp / 25),
    [t('stat.resource')]: Math.round(baseStats.resource / 3),
    [t('stat.luck')]: Math.round(baseStats.luck / 3),
  };
}

function creatorClasses(): CreatorClass[] {
  return CLASS_LIST.map((definition) => ({
    id: definition.id,
    name: t(definition.nameKey),
    art: definition.art.portrait,
    icon: definition.art.glyph,
    blurb: t(definition.descriptionKey),
    stats: statBars(definition.id),
    difficulty: definition.difficulty,
    skills: [
      {
        name: t(definition.signature.nameKey),
        icon: definition.signature.glyph,
        hint: t(definition.signature.descriptionKey),
      },
      {
        name: t(definition.resource.nameKey),
        icon: 'glyph-arcane-symbol',
        hint: t(definition.resource.fillDescriptionKey),
      },
      {
        name: t(definition.weaponDescriptionKey),
        icon: 'glyph-crossed-swords',
        hint: t(definition.weaponDescriptionKey),
      },
    ],
  }));
}

export function createHeroCreationScreen(options: HeroCreationScreenOptions): Screen {
  const { store, onCreate, onCancel } = options;
  const parts: FuiComponent[] = [];

  const taken = takenNames(store.get());

  const creator = new CharacterCreator({
    title: t('create.title'),
    classes: creatorClasses(),
    nameField: true,
    namePlaceholder: t('create.namePlaceholder'),
    confirmLabel: t('create.confirm'),
    statMax: 5,
  });
  parts.push(creator);

  const back = new Button({ label: t('create.back'), variant: 'ghost' });
  parts.push(back);
  back.on('click', () => onCancel());

  const error = h('p', { class: 'omf-create__error', dataset: { testid: 'name-error' } });

  creator.on<{ class?: string; name?: string }>('creator:confirm', (detail) => {
    const name = typeof detail?.name === 'string' ? detail.name : '';
    const classId = detail?.class as ClassId | undefined;

    const check = checkName(name, taken);
    if (!check.ok) {
      error.textContent = t(PROBLEM_STRINGS[check.problem ?? 'empty']);
      return;
    }
    if (!classId) return;

    error.textContent = '';
    onCreate({ name, classId });
  });

  const el = h(
    'div',
    { class: 'omf-create', dataset: { fuiTheme: 'stone-vine', testid: 'hero-creation' } },
    creator.el,
    h('div', { class: 'omf-create__footer' }, error, back.el),
  );

  return {
    el,
    destroy() {
      for (const part of parts) part.destroy();
      el.remove();
    },
  };
}
