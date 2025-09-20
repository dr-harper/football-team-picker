import test from 'node:test';
import assert from 'node:assert/strict';
import { areColorsTooSimilar, pickSecondColor } from '../src/utils/colorUtils.ts';

// Helper to fix Math.random
function withMockedRandom(value: number, fn: () => void) {
  const original = Math.random;
  Math.random = () => value;
  try { fn(); } finally { Math.random = original; }
}

test('areColorsTooSimilar detects similar colors', () => {
  assert.equal(areColorsTooSimilar('#ff0000', '#ff0001'), true);
});

test('areColorsTooSimilar detects distinct colors', () => {
  assert.equal(areColorsTooSimilar('#ff0000', '#0000ff'), false);
});

test('pickSecondColor avoids similar color when possible', () => {
  withMockedRandom(0, () => {
    const palette = ['#ff0000', '#ff0101', '#0000ff'];
    const result = pickSecondColor('#ff0000', palette);
    assert.equal(result, '#0000ff');
  });
});

test('pickSecondColor falls back when all colors similar', () => {
  withMockedRandom(0, () => {
    const palette = ['#ff0000', '#ff0001', '#ff0002'];
    const result = pickSecondColor('#ff0000', palette);
    assert.equal(result, '#ff0001');
  });
});

