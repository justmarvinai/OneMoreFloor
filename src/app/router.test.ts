import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, type Screen } from './router.ts';

function makeScreen(label: string, destroySpy = vi.fn()): Screen {
  const el = document.createElement('div');
  el.dataset.screen = label;
  return { el, destroy: destroySpy };
}

describe('createRouter', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.replaceChildren(mount);
  });

  it('mounts the screen it is sent to', () => {
    const router = createRouter({
      mount,
      routes: { title: () => makeScreen('title') },
    });

    router.go('title');

    expect(router.current()).toBe('title');
    expect(mount.querySelector('[data-screen="title"]')).not.toBeNull();
  });

  it('destroys the outgoing screen before mounting the next', () => {
    const destroyTitle = vi.fn();
    const order: string[] = [];
    const router = createRouter({
      mount,
      routes: {
        title: () =>
          makeScreen(
            'title',
            destroyTitle.mockImplementation(() => order.push('destroy')),
          ),
        tower: () => {
          order.push('construct');
          return makeScreen('tower');
        },
      },
    });

    router.go('title');
    router.go('tower');

    expect(destroyTitle).toHaveBeenCalledOnce();
    expect(order).toEqual(['destroy', 'construct']);
    expect(mount.querySelector('[data-screen="title"]')).toBeNull();
    expect(mount.querySelector('[data-screen="tower"]')).not.toBeNull();
  });

  it('leaves nothing behind in the mount between screens', () => {
    const router = createRouter({
      mount,
      routes: { a: () => makeScreen('a'), b: () => makeScreen('b') },
    });

    router.go('a');
    router.go('b');

    expect(mount.children).toHaveLength(1);
  });

  it('rebuilds the screen when re-entering the same route', () => {
    const destroy = vi.fn();
    const construct = vi.fn(() => makeScreen('title', destroy));
    const router = createRouter({ mount, routes: { title: construct } });

    router.go('title');
    router.go('title');

    expect(construct).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('destroy() tears the active screen down and clears the mount', () => {
    const destroy = vi.fn();
    const router = createRouter({ mount, routes: { title: () => makeScreen('title', destroy) } });

    router.go('title');
    router.destroy();

    expect(destroy).toHaveBeenCalledOnce();
    expect(router.current()).toBeNull();
    expect(mount.children).toHaveLength(0);
  });

  it('throws on an unregistered screen id', () => {
    const router = createRouter<'title' | 'ghost'>({
      mount,
      routes: { title: () => makeScreen('title') } as never,
    });

    expect(() => router.go('ghost')).toThrow(/no screen registered/);
  });

  it('hands a construction failure to onError instead of crashing', () => {
    const onError = vi.fn();
    const boom = new Error('screen exploded');
    const router = createRouter({
      mount,
      routes: {
        broken: () => {
          throw boom;
        },
      },
      onError,
    });

    expect(() => router.go('broken')).not.toThrow();
    expect(onError).toHaveBeenCalledWith(boom, 'broken');
  });

  it('rethrows a construction failure when no handler is registered', () => {
    const router = createRouter({
      mount,
      routes: {
        broken: () => {
          throw new Error('screen exploded');
        },
      },
    });

    expect(() => router.go('broken')).toThrow('screen exploded');
  });
});
