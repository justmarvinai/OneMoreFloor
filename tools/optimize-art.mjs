#!/usr/bin/env node
/**
 * Turn the source art in `assets/` into web-sized files under `public/art/`.
 *
 * Source art is deliberately kept at full resolution in the repo — it is the
 * master copy, and re-exporting from it later (bigger displays, new formats)
 * beats re-commissioning it. What ships is the optimised derivative: the class
 * portraits arrive at 2048×2048 PNG, roughly 4 MB each, which is about forty
 * times more than a character-creation panel can use.
 *
 *   npm run art:optimize
 *
 * Output is committed, so neither CI nor Vercel needs this tool — it runs when
 * the source art changes. `--check` verifies the committed output is current
 * without writing anything, which is what CI uses.
 */
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

/** Each job: where the masters live, where the web copies go, and how big. */
const JOBS = [
  {
    name: 'class portraits',
    from: path.join(ROOT, 'assets/class_avatars'),
    to: path.join(ROOT, 'public/art/classes'),
    width: 768,
    quality: 82,
    /** `Warrior.png` → `warrior.webp`, matching the class ids in content. */
    rename: (file) => `${path.basename(file, path.extname(file)).toLowerCase()}.webp`,
  },
];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let written = 0;
  let stale = 0;

  for (const job of JOBS) {
    if (!(await exists(job.from))) {
      console.error(`skipping ${job.name}: ${path.relative(ROOT, job.from)} does not exist`);
      continue;
    }

    await mkdir(job.to, { recursive: true });
    const files = (await readdir(job.from)).filter((file) => /\.(png|jpe?g|webp)$/i.test(file));

    for (const file of files) {
      const source = path.join(job.from, file);
      const target = path.join(job.to, job.rename(file));

      if (CHECK_ONLY) {
        const upToDate =
          (await exists(target)) && (await stat(target)).mtimeMs >= (await stat(source)).mtimeMs;
        if (!upToDate) {
          console.error(`stale or missing: ${path.relative(ROOT, target)}`);
          stale += 1;
        }
        continue;
      }

      await sharp(source)
        .resize({ width: job.width, withoutEnlargement: true })
        .webp({ quality: job.quality })
        .toFile(target);

      const { size } = await stat(target);
      console.log(`${path.relative(ROOT, target)}  ${(size / 1024).toFixed(0)} KB`);
      written += 1;
    }
  }

  if (CHECK_ONLY && stale > 0) {
    console.error(`\n${stale} file(s) out of date — run \`npm run art:optimize\` and commit.`);
    process.exitCode = 1;
    return;
  }
  if (!CHECK_ONLY) console.log(`\nOptimised ${written} file(s).`);
}

main().catch((error) => {
  console.error(`optimize-art: ${error.message}`);
  process.exitCode = 1;
});
