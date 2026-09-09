import { describe, expect, it, vi } from 'vitest';
import { localId } from './ids';

describe('localId', () => {
  it('no repite dentro del mismo milisegundo', () => {
    /* El reloj congelado es justo el caso que rompía: `Date.now()` a solas
       devolvía el mismo identificador para dos altas seguidas. */
    vi.spyOn(Date, 'now').mockReturnValue(1_757_000_000_000);
    const ids = Array.from({ length: 500 }, () => localId('c'));
    expect(new Set(ids).size).toBe(500);
    vi.restoreAllMocks();
  });

  it('lleva el prefijo que se le pide', () => {
    expect(localId('mov')).toMatch(/^mov-/);
  });
});
