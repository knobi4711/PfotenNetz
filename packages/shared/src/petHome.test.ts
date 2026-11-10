import { describe, expect, it } from 'vitest';
import { GENERIC_PET_HOME_LABEL, petHomeLabel } from './petHome';

describe('petHomeLabel', () => {
  it('falls back to the generic label without pets', () => {
    expect(petHomeLabel([])).toBe(GENERIC_PET_HOME_LABEL);
  });

  it('uses the name of a single pet', () => {
    expect(petHomeLabel([{ name: 'Bello' }])).toBe('Bello-Zuhause');
  });

  it('joins two pets', () => {
    expect(petHomeLabel([{ name: 'Bello' }, { name: 'Luna' }])).toBe("Bello's und Luna's-Zuhause");
  });

  it('falls back to the generic label from three pets on', () => {
    expect(petHomeLabel([{ name: 'Bello' }, { name: 'Luna' }, { name: 'Mimi' }])).toBe(
      GENERIC_PET_HOME_LABEL
    );
  });

  it('ignores inactive and deceased pets', () => {
    expect(
      petHomeLabel([
        { name: 'Bello', is_active: true },
        { name: 'Luna', is_active: false },
        { name: 'Mimi', is_deceased: true },
      ])
    ).toBe('Bello-Zuhause');
  });

  it('ignores blank names and trims the rest', () => {
    expect(petHomeLabel([{ name: '   ' }, { name: ' Luna ' }])).toBe('Luna-Zuhause');
  });
});
