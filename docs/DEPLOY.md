# Deploying OneMoreFloor — Early Access 0.1

The game is a folder of static files. There is no server, no database, no
environment variable and no secret anywhere in it (Brief §21) — a deploy is
"copy `dist/` to a host that serves files". This document is the checklist the
owner follows; it names what to verify before pushing the button, and what to do
when something looks wrong afterwards.

## 0. Who does this

Deployment is the owner's action, not the build's: it needs the Vercel account
that owns the project. Nothing in this repository holds a credential, and
nothing in CI deploys.

## 1. Before you deploy

Run the full verification list from a clean checkout. CI runs the same list in
the same order, so a green CI run on the commit you are about to ship is
equivalent — check the run, don't re-run it by hand.

```
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run content:validate
npm run sim
npm run build
npm run smoke
```

Then confirm, by eye, three things a test cannot judge:

- **The `CHANGELOG.md` top section names this release** and every user-visible
  change in it (§22).
- **`CURRENT_SCHEMA_VERSION` never went down.** It is `5` as of EA 0.1. A build
  that lowers it makes existing players' saves unreadable — the migration
  registry only walks forwards (SAVE_SCHEMA §4). If it went *up*, its migration
  and its captured-blob fixture must be in the same commit.
- **The version you are shipping is the version you tested.** Deploy a commit,
  never a dirty working tree.

## 2. Deploy

Vercel reads `vercel.json` at the repository root and needs no dashboard
configuration beyond connecting the repo:

| Setting | Value | Where it comes from |
|---|---|---|
| Framework | Vite | `vercel.json` |
| Install | `npm ci` | `vercel.json` |
| Build | `npm run build` | `vercel.json` |
| Output | `dist` | `vercel.json` |
| Node | 22.x or newer | matches the CI matrix |

`npm run build` typechecks before it bundles, so a type error fails the deploy
rather than shipping.

Two cache rules are already declared, and they matter: `/fui/*` and `/assets/*`
are content-hashed or immutable art and are served `max-age=31536000, immutable`;
`index.html` is deliberately *not* in that list, because it is the file that
points at the new hashes. Leave it on Vercel's default (revalidated) — making
`index.html` immutable is how a static site pins players to an old build.

## 3. After you deploy — the five-minute smoke

Do this on the production URL, in a *fresh* profile or private window, so you
see what a new player sees:

1. **Boot.** The title screen paints, "Enter the Spire" works, and the console is
   clean — no 404, no error.
2. **Create a hero.** All five classes offer, the name field accepts and rejects
   as documented, and the tutorial starts.
3. **Fight a floor.** The combat set-piece plays, the verdict lands, loot is
   granted.
4. **Reload the tab.** The hero, floor, gold and inventory come back exactly as
   they were. This is the save layer's whole promise.
5. **Pull the network.** With DevTools set to Offline, reload. The game boots and
   plays — everything it needs is on the origin (§21, ARCHITECTURE §6).

If step 5 fails, the build fetched something remote; the smoke suite's
`ARCHITECTURE §6` test catches that in CI, so treat a failure here as a signal
that something bypassed the build.

## 4. If it goes wrong

**Roll back first, diagnose second.** Vercel keeps every previous deployment;
promoting the last good one is instant and needs no rebuild. Players' saves are
in their own browsers and are untouched by a rollback — with one exception, which
is why §1 insists on it: if the bad build *raised* the schema version, players
who opened it have already been migrated forward, and the rolled-back build will
refuse their save and fall back down the recovery ladder (SAVE_SCHEMA §5). A
schema bump is therefore the one change worth a second pair of eyes before it
ships.

## 5. Reading a player's stack trace

The deployed bundle carries no source map, on purpose: a map is a full copy of
the source, and there is no error tracker on the other end to consume one (§21,
`vite.config.ts`). When a player sends a minified trace, check out the tag you
deployed and rebuild it with maps:

```
git checkout <tag>
npx vite build --sourcemap
```

The build is deterministic, so the frames in their screenshot line up with the
map you just produced. Do not deploy that build.

## 6. What this deploy is *not*

No Electron build, no auto-update, no store packaging — §21 puts all of that
after Early Access. What the build already guarantees for that later wrap is
that every URL it emits is relative, so `dist/index.html` loads from disk as
happily as from a site root; a smoke test asserts it on every run
(ARCHITECTURE §6).
