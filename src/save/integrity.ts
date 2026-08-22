/**
 * Record integrity.
 *
 * Every persisted record carries a checksum over its own contents so a truncated
 * or half-written blob is *detected* rather than loaded as if it were fine
 * (SAVE_SCHEMA §6). Detection is what makes the recovery ladder possible: without
 * it, corruption looks like a legitimate save with strange numbers in it.
 */

export interface Integrity {
  /** CRC-32 of the record's canonical JSON, excluding this field. */
  readonly crc32: string;
  /** When the record was written, from the clock service. */
  readonly writtenAt: number;
  /** Generation counter — increments on every write, used to order backups. */
  readonly gen: number;
}

export interface Persisted {
  readonly integrity: Integrity;
}

/**
 * JSON with object keys sorted at every level, so two structurally equal records
 * always hash the same regardless of the order their fields were assigned in.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (source[key] === undefined) continue;
    sorted[key] = sortKeys(source[key]);
  }
  return sorted;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const UTF8 = new TextEncoder();

/**
 * Standard CRC-32 (IEEE 802.3) of a string's UTF-8 bytes, as 8 lowercase hex
 * digits. Encoding to UTF-8 first is what keeps this interoperable — the value
 * matches any other CRC-32 implementation, so a diagnostic dump can be checked
 * outside the game.
 */
export function crc32(text: string): string {
  const bytes = UTF8.encode(text);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/** Attach a fresh integrity block to a record. */
export function stamp<T extends object>(
  record: T,
  options: { writtenAt: number; gen: number },
): T & Persisted {
  const { integrity: _discarded, ...body } = record as T & Partial<Persisted>;
  return {
    ...(body as T),
    integrity: {
      crc32: crc32(canonicalJson(body)),
      writtenAt: options.writtenAt,
      gen: options.gen,
    },
  };
}

/** True when a record's contents still match the checksum it was written with. */
export function verify(record: unknown): record is Persisted {
  if (record === null || typeof record !== 'object') return false;
  const { integrity, ...body } = record as Partial<Persisted> & Record<string, unknown>;
  if (!integrity || typeof integrity.crc32 !== 'string') return false;
  return crc32(canonicalJson(body)) === integrity.crc32;
}
