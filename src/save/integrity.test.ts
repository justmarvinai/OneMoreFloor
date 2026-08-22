import { describe, expect, it } from 'vitest';
import { canonicalJson, crc32, stamp, verify } from './integrity.ts';

describe('canonicalJson', () => {
  it('is insensitive to key order', () => {
    expect(canonicalJson({ gold: 1, floor: 2 })).toBe(canonicalJson({ floor: 2, gold: 1 }));
  });

  it('sorts nested keys too', () => {
    expect(canonicalJson({ a: { z: 1, y: 2 } })).toBe(canonicalJson({ a: { y: 2, z: 1 } }));
  });

  it('preserves array order, which is meaningful', () => {
    expect(canonicalJson([1, 2, 3])).not.toBe(canonicalJson([3, 2, 1]));
  });

  it('drops undefined fields so they hash like absent ones', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
  });
});

describe('crc32', () => {
  it('matches known values', () => {
    // The standard CRC-32 check vectors.
    expect(crc32('')).toBe('00000000');
    expect(crc32('a')).toBe('e8b7be43');
    expect(crc32('123456789')).toBe('cbf43926');
  });

  it('changes when the content changes', () => {
    expect(crc32('gold: 100')).not.toBe(crc32('gold: 101'));
  });

  it('handles non-ASCII text', () => {
    expect(crc32('Grímhild')).toHaveLength(8);
    expect(crc32('Grímhild')).not.toBe(crc32('Grimhild'));
  });
});

describe('stamp / verify', () => {
  it('round-trips a stamped record', () => {
    const record = stamp({ gold: 100, floor: 12 }, { writtenAt: 1_000, gen: 3 });
    expect(record.gold).toBe(100);
    expect(record.integrity.writtenAt).toBe(1_000);
    expect(record.integrity.gen).toBe(3);
    expect(verify(record)).toBe(true);
  });

  it('detects a tampered field', () => {
    const record = stamp({ gold: 100 }, { writtenAt: 1_000, gen: 1 });
    expect(verify({ ...record, gold: 999_999 })).toBe(false);
  });

  it('detects a dropped field', () => {
    const record = stamp({ gold: 100, floor: 12 }, { writtenAt: 1_000, gen: 1 });
    const { floor: _dropped, ...truncated } = record;
    expect(verify(truncated)).toBe(false);
  });

  it('re-stamping replaces the old integrity block rather than hashing it', () => {
    const first = stamp({ gold: 1 }, { writtenAt: 1_000, gen: 1 });
    const second = stamp(first, { writtenAt: 2_000, gen: 2 });
    expect(second.integrity.gen).toBe(2);
    expect(verify(second)).toBe(true);
    // Equal contents hash equally regardless of the previous stamp.
    expect(second.integrity.crc32).toBe(first.integrity.crc32);
  });

  it('rejects records with no integrity block at all', () => {
    expect(verify({ gold: 100 })).toBe(false);
    expect(verify(null)).toBe(false);
    expect(verify('not a record')).toBe(false);
  });
});
