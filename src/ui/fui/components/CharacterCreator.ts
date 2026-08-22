import { FuiComponent, type BaseOptions } from '../core/component.ts';
import { h, clear, clamp } from '../core/dom.ts';

export interface CreatorClass {
  id: string;
  name: string;
  /** Manifest asset id for the full-body art. */
  art?: string;
  /** Glyph asset id for the class mark. Drawn as a mask, so glyphs only. */
  icon?: string;
  /** One line of pitch. */
  blurb?: string;
  /** Starting stats, drawn as bars. */
  stats?: Record<string, number>;
  /** Signature abilities. `icon` is a glyph asset id — it is drawn as a mask. */
  skills?: { name: string; icon?: string; hint?: string }[];
  /** How hard it is to play, 1–3. */
  difficulty?: number;
  /** Locked classes show the unlock condition instead of Begin. */
  lockedBy?: string;
}

export interface CreatorOption {
  id: string;
  /** What is being chosen, e.g. `'Origin'`. */
  label: string;
  /** The choices. */
  choices: { id: string; label: string; hint?: string }[];
  /** Which choice starts selected. */
  value?: string;
}

export interface CharacterCreatorOptions extends BaseOptions {
  /** Classes to pick between. */
  classes: CreatorClass[];
  /** Which class starts selected. */
  selected?: string;
  /** Extra choices under the class — origin, deity, difficulty. */
  options?: CreatorOption[];
  /** Show the name field. */
  nameField?: boolean;
  /** Value of the name field. */
  name?: string;
  /** Placeholder for the name field. */
  namePlaceholder?: string;
  /** Highest value a stat bar can show. */
  statMax?: number;
  /** Heading. */
  title?: string;
  /** Label for the confirm button. */
  confirmLabel?: string;
}

/**
 * The whole new-character flow on one screen: class on the left, a full-height
 * portrait in the middle, stats and choices on the right, one button out.
 *
 *   const creator = new CharacterCreator({
 *     title: 'Create your hero', classes: startingClasses, nameField: true,
 *     options: [{ id: 'origin', label: 'Origin', choices: origins, value: 'exile' }],
 *   });
 *   creator.on<{ class: string; name: string; options: Record<string, string> }>(
 *     'creator:confirm', (build) => game.startNewRun(build));
 *
 * Everything the player picks funnels into one `creator:confirm` payload, so a
 * caller never has to reassemble the build from four separate events. A locked
 * class stays visible with its unlock condition on the button: the point of the
 * screen is partly to show what there is to play toward, and a hidden class
 * cannot do that.
 */
export class CharacterCreator extends FuiComponent<CharacterCreatorOptions> {
  private roster: HTMLElement;
  private stage: HTMLElement;
  private detail: HTMLElement;
  private confirm: HTMLButtonElement;
  private nameInput: HTMLInputElement | null = null;
  private picks = new Map<string, string>();

  constructor(opts: CharacterCreatorOptions) {
    const root = h('div', { class: 'fui fui-creator' });
    super(root, opts);
    this.opts.selected = opts.selected ?? opts.classes[0]?.id;
    for (const option of opts.options ?? []) {
      this.picks.set(option.id, option.value ?? option.choices[0]?.id ?? '');
    }

    root.appendChild(h('h2', { class: 'fui-creator__title', text: opts.title ?? 'Create your hero' }));

    const cols = h('div', { class: 'fui-creator__cols' });

    this.roster = h('div', { class: 'fui-creator__roster', attrs: { role: 'listbox' } });
    cols.appendChild(this.roster);

    this.stage = h('div', { class: 'fui-creator__stage' });
    this.stage.appendChild(h('span', { class: 'fui-creator__art' }));
    this.stage.appendChild(h('span', { class: 'fui-creator__pedestal' }));
    cols.appendChild(this.stage);

    this.detail = h('div', { class: 'fui-creator__detail' });
    cols.appendChild(this.detail);

    root.appendChild(cols);

    const foot = h('div', { class: 'fui-creator__foot' });
    if (opts.nameField) {
      this.nameInput = h('input', {
        class: 'fui-creator__name',
        attrs: {
          type: 'text',
          value: opts.name ?? '',
          placeholder: opts.namePlaceholder ?? 'Name your hero',
          maxlength: 24,
          'aria-label': 'Character name',
        },
      });
      this.nameInput.addEventListener('input', () => {
        this.opts.name = this.nameInput?.value ?? '';
        this.paintFoot();
      });
      foot.appendChild(this.nameInput);
    }
    this.confirm = h('button', {
      class: 'fui-creator__confirm',
      attrs: { type: 'button' },
      text: opts.confirmLabel ?? 'Begin',
    });
    this.confirm.addEventListener('click', () => {
      const cls = this.current();
      if (!cls || cls.lockedBy) return;
      this.emit('creator:confirm', {
        class: cls.id,
        name: this.opts.name ?? '',
        options: Object.fromEntries(this.picks),
      });
    });
    foot.appendChild(this.confirm);
    root.appendChild(foot);

    this.buildRoster();
    this.paint();
  }

  /** Pick a class. */
  select(id: string): this {
    if (!this.opts.classes.some((c) => c.id === id)) return this;
    this.opts.selected = id;
    this.paint();
    this.emit('creator:class', this.current());
    return this;
  }

  /** Set one of the extra choices. */
  choose(optionId: string, choiceId: string): this {
    this.picks.set(optionId, choiceId);
    this.paint();
    this.emit('creator:option', { option: optionId, choice: choiceId });
    return this;
  }

  /** The build as it currently stands. */
  build(): { class: string | undefined; name: string; options: Record<string, string> } {
    return {
      class: this.opts.selected,
      name: this.opts.name ?? '',
      options: Object.fromEntries(this.picks),
    };
  }

  private current(): CreatorClass | undefined {
    return this.opts.classes.find((c) => c.id === this.opts.selected);
  }

  private buildRoster(): void {
    clear(this.roster);
    for (const cls of this.opts.classes) {
      const item = h('button', {
        class: 'fui-creator__pick',
        dataset: { id: cls.id, locked: cls.lockedBy ? 'on' : 'off' },
        attrs: { type: 'button', role: 'option' },
      });
      item.appendChild(
        h('span', {
          class: 'fui-creator__mark',
          dataset: { glyph: cls.icon ? 'on' : 'off' },
          style: cls.icon ? { '--fui-creator-glyph': `var(--fui-img-${cls.icon})` } : undefined,
          text: cls.icon ? '' : cls.name.slice(0, 1),
        }),
      );
      item.appendChild(h('span', { class: 'fui-creator__pickname', text: cls.name }));
      item.addEventListener('click', () => this.select(cls.id));
      this.roster.appendChild(item);
    }
  }

  private paint(): void {
    const cls = this.current();
    if (!cls) return;

    for (const item of Array.from(this.roster.children) as HTMLElement[]) {
      const on = item.dataset.id === cls.id;
      item.dataset.state = on ? 'on' : 'off';
      item.setAttribute('aria-selected', String(on));
    }

    if (cls.art) this.stage.style.setProperty('--fui-creator-art', `var(--fui-img-${cls.art})`);
    else this.stage.style.removeProperty('--fui-creator-art');
    this.stage.dataset.locked = cls.lockedBy ? 'on' : 'off';

    clear(this.detail);
    this.detail.appendChild(h('h3', { class: 'fui-creator__name-h', text: cls.name }));
    if (cls.difficulty != null) {
      const diff = h('div', { class: 'fui-creator__difficulty' });
      diff.appendChild(h('span', { class: 'fui-creator__difflabel', text: 'Difficulty' }));
      for (let i = 1; i <= 3; i += 1) {
        diff.appendChild(
          h('span', { class: 'fui-creator__diffpip', dataset: { on: i <= cls.difficulty ? 'on' : 'off' } }),
        );
      }
      this.detail.appendChild(diff);
    }
    if (cls.blurb) this.detail.appendChild(h('p', { class: 'fui-creator__blurb', text: cls.blurb }));

    if (cls.stats) {
      const max = this.opts.statMax ?? Math.max(...Object.values(cls.stats), 1);
      const stats = h('div', { class: 'fui-creator__stats' });
      for (const [key, value] of Object.entries(cls.stats)) {
        const row = h('div', { class: 'fui-creator__stat' });
        row.appendChild(h('span', { class: 'fui-creator__statname', text: key }));
        const bar = h('span', { class: 'fui-creator__statbar' });
        bar.appendChild(
          h('span', {
            class: 'fui-creator__statfill',
            style: { width: `${clamp(value / max, 0, 1) * 100}%` },
          }),
        );
        row.appendChild(bar);
        row.appendChild(h('span', { class: 'fui-creator__statnum fui-num', text: String(value) }));
        stats.appendChild(row);
      }
      this.detail.appendChild(stats);
    }

    if (cls.skills?.length) {
      const skills = h('div', { class: 'fui-creator__skills' });
      for (const skill of cls.skills) {
        const chip = h('span', {
          class: 'fui-creator__skill',
          dataset: { glyph: skill.icon ? 'on' : 'off' },
          style: skill.icon ? { '--fui-creator-skill': `var(--fui-img-${skill.icon})` } : undefined,
          attrs: skill.hint ? { title: skill.hint } : undefined,
        });
        chip.appendChild(h('span', { class: 'fui-creator__skillname', text: skill.name }));
        skills.appendChild(chip);
      }
      this.detail.appendChild(skills);
    }

    for (const option of this.opts.options ?? []) {
      const group = h('div', { class: 'fui-creator__option' });
      group.appendChild(h('span', { class: 'fui-creator__optlabel', text: option.label }));
      const row = h('div', { class: 'fui-creator__choices' });
      for (const choice of option.choices) {
        const btn = h('button', {
          class: 'fui-creator__choice',
          dataset: { on: this.picks.get(option.id) === choice.id ? 'on' : 'off' },
          attrs: { type: 'button', ...(choice.hint ? { title: choice.hint } : {}) },
          text: choice.label,
        });
        btn.addEventListener('click', () => this.choose(option.id, choice.id));
        row.appendChild(btn);
      }
      group.appendChild(row);
      this.detail.appendChild(group);
    }

    this.paintFoot();
  }

  private paintFoot(): void {
    const cls = this.current();
    const locked = !!cls?.lockedBy;
    this.confirm.disabled = locked;
    this.confirm.dataset.state = locked ? 'locked' : 'open';
    this.confirm.textContent = locked ? cls!.lockedBy! : (this.opts.confirmLabel ?? 'Begin');
  }
}
