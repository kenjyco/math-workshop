import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyBoard as rawEmpty,
  place as rawPlace,
  remove,
  resize as rawResize,
  turn,
  fillRow as rawFill,
  tray as rawTray,
} from './board.ts';
const rules = {
  total: 24,
  widths: { min: 1, max: 24 },
  startWidth: 6,
  exampleWidth: 6,
};
const emptyBoard = (w = 6) => rawEmpty(rules, w);
const tray = (b: Board) => rawTray(b, rules);
const place = (b: Board, id: number, x: number, y: number) =>
  rawPlace(b, id, x, y, rules);
const resize = (b: Board, w: number) => rawResize(b, w, rules);
const fillRow = (b: Board, y: number) => rawFill(b, y, rules);
import type { Board } from './types.ts';
function inventory(b: Board) {
  assert.equal(b.tiles.length + tray(b).length, 24);
  assert.equal(new Set([...b.tiles.map((t) => t.id), ...tray(b)]).size, 24);
  assert.equal(
    new Set(b.tiles.map((t) => `${t.x},${t.y}`)).size,
    b.tiles.length,
  );
  for (const t of b.tiles)
    assert.ok(t.x >= 0 && t.x < b.width && t.y >= 0 && t.y < b.height);
}
test('edits conserve inventory and preserve identities, gaps and exact turns', () => {
  let b = emptyBoard(5);
  for (let y = 0; y < 5; y++) b = fillRow(b, y);
  inventory(b);
  assert.equal(b.tiles.length, 24);
  assert.equal(b.width * b.height, 25);
  assert.deepEqual(turn(turn(b)), b);
  assert.equal(turn(b).tiles.find((t) => t.id === 6)?.x, 1);
  const small = resize(b, 1);
  assert.equal(small.tiles.length, 5);
  assert.deepEqual(
    small.tiles.map((t) => t.id),
    [1, 6, 11, 16, 21],
  );
  inventory(small);
  const wide = turn(small);
  assert.equal(wide.height, 1);
  assert.equal(wide.width, 24);
  inventory(wide);
});
test('outside, occupied and invalid targets leave a valid board; deterministic edit sequence', () => {
  let b = place(emptyBoard(), 1, 0, 0);
  assert.equal(place(b, 2, 0, 0), b);
  assert.equal(place(b, 1, -1, 0), b);
  assert.equal(place(b, 25, 1, 0), b);
  for (let n = 0; n < 300; n++) {
    switch (n % 5) {
      case 0:
        b = resize(b, (n % 24) + 1);
        break;
      case 1:
        b = turn(b);
        break;
      case 2:
        b = fillRow(b, n % b.height);
        break;
      case 3:
        b = remove(b, (n % 24) + 1);
        break;
      case 4:
        b = place(b, (n % 24) + 1, n % b.width, n % b.height);
        break;
    }
    inventory(b);
  }
});

test('a full chosen row is unchanged and never advances; arbitrary IDs survive turns', () => {
  const chosen = fillRow(place(emptyBoard(8), 24, 0, 1), 1);
  assert.equal(chosen.tiles.length, 8);
  assert.equal(chosen.tiles.find((t) => t.id === 24)?.y, 1);
  assert.equal(fillRow(chosen, 1), chosen);
  assert.equal(chosen.tiles.filter((t) => t.y === 0 || t.y === 2).length, 0);
  const turned = turn(chosen);
  assert.deepEqual(
    turned.tiles.find((t) => t.id === 24),
    { id: 24, x: 1, y: 0 },
  );
  assert.deepEqual(turn(turned), chosen);
  inventory(turned);
});

test('width changes retain exact in-bounds IDs without resurrecting an earlier layout', () => {
  const original: Board = {
    width: 6,
    height: 4,
    tiles: [
      [18, 1, 0],
      [8, 5, 0],
      [1, 4, 1],
      [13, 5, 1],
      [7, 2, 2],
      [2, 0, 3],
      [3, 1, 3],
      [4, 2, 3],
      [5, 3, 3],
      [6, 4, 3],
      [20, 5, 3],
    ].map(([id, x, y]) => ({ id, x, y })),
  };
  const narrow = resize(original, 2);
  assert.deepEqual(narrow, {
    width: 2,
    height: 12,
    tiles: [
      { id: 18, x: 1, y: 0 },
      { id: 2, x: 0, y: 3 },
      { id: 3, x: 1, y: 3 },
    ],
  });
  const wide = resize(narrow, 18);
  assert.deepEqual(wide, {
    width: 18,
    height: 2,
    tiles: [{ id: 18, x: 1, y: 0 }],
  });
  const returned = resize(wide, 6);
  assert.deepEqual(returned, {
    width: 6,
    height: 4,
    tiles: [{ id: 18, x: 1, y: 0 }],
  });
  for (const b of [original, narrow, wide, returned]) {
    inventory(b);
    assert.equal(resize(b, b.width), b);
  }
  const turned = turn(emptyBoard(7));
  assert.equal(turned.height, 7);
  assert.equal(
    resize(turned, 4),
    turned,
    'same width must not recalculate a transposed frame',
  );
});

for (const n of [1, 7, 12, 16, 24, 36]) {
  test(`configured ${n}: every width, exact turns, partial row fill and inventory`, () => {
    const r = {
      total: n,
      widths: { min: 1, max: n },
      startWidth: 1,
      exampleWidth: 1,
    };
    for (let w = 1; w <= n; w++) {
      let b = rawEmpty(r, w);
      assert.equal(b.height, Math.ceil(n / w));
      b = rawPlace(b, n, w - 1, b.height - 1, r);
      assert.deepEqual(b.tiles, [{ id: n, x: w - 1, y: b.height - 1 }]);
      const turned = turn(b);
      assert.equal(rawResize(turned, turned.width, r), turned);
      assert.deepEqual(turn(turned), b);
      for (let y = 0; y < b.height; y++) b = rawFill(b, y, r);
      assert.equal(b.tiles.length, n);
      assert.equal(rawTray(b, r).length, 0);
      assert.deepEqual(
        [...b.tiles.map((t) => t.id)].sort((a, b) => a - b),
        Array.from({ length: n }, (_, i) => i + 1),
      );
      assert.equal(new Set(b.tiles.map((t) => `${t.x},${t.y}`)).size, n);
      assert.deepEqual(
        b.tiles.find((t) => t.id === n),
        { id: n, x: w - 1, y: b.height - 1 },
      );
      assert.equal(rawFill(b, 0, r), b);
      for (const target of [0, n + 1, 1.5])
        assert.equal(rawResize(b, target, r), b);
      for (const id of [0, n + 1, 1.5])
        assert.equal(rawPlace(b, id, 0, 0, r), b);
      assert.equal(rawPlace(b, 1, -1, 0, r), b);
      const narrow = rawResize(b, 1, r);
      assert.deepEqual(
        narrow.tiles,
        b.tiles.filter((t) => t.x === 0),
      );
      assert.equal(narrow.tiles.length + rawTray(narrow, r).length, n);
      const returned = rawResize(narrow, w, r);
      assert.deepEqual(
        returned.tiles,
        narrow.tiles.filter((t) => t.y < returned.height),
      );
    }
  });
}

test('fill the selected row with only the remaining tray; never advance it', () => {
  const r = {
    total: 7,
    widths: { min: 1, max: 7 },
    startWidth: 3,
    exampleWidth: 7,
  };
  let b = rawPlace(rawEmpty(r), 7, 2, 0, r);
  b = rawFill(b, 0, r);
  b = rawFill(b, 1, r);
  assert.equal(rawTray(b, r).length, 1);
  b = rawFill(b, 2, r);
  assert.deepEqual(
    b.tiles.filter((t) => t.y === 2),
    [{ id: 6, x: 0, y: 2 }],
  );
  assert.equal(b.tiles.find((t) => t.id === 7)?.x, 2);
  assert.equal(rawFill(b, 2, r), b);
});

test('restricted widths keep exact turned geometry outside the selection range', () => {
  const r = {
    total: 24,
    widths: { min: 4, max: 24 },
    startWidth: 6,
    exampleWidth: 6,
  };
  const turned = turn(rawPlace(rawEmpty(r, 13), 24, 12, 1, r));
  assert.deepEqual(turned, {
    width: 2,
    height: 13,
    tiles: [{ id: 24, x: 1, y: 12 }],
  });
  assert.equal(rawResize(turned, 2, r), turned);
  assert.equal(rawResize(turned, 3, r), turned);
  assert.deepEqual(rawResize(turned, 6, r), { width: 6, height: 4, tiles: [] });
});
