import type { Board, FactorRules } from './types.ts';
export const emptyBoard = (
  rules: FactorRules,
  width = rules.startWidth,
): Board => ({
  width,
  height: Math.ceil(rules.total / width),
  tiles: [],
});
export const tray = (board: Board, rules: FactorRules) =>
  Array.from({ length: rules.total }, (_, i) => i + 1).filter(
    (id) => !board.tiles.some((t) => t.id === id),
  );
export function place(
  board: Board,
  id: number,
  x: number,
  y: number,
  rules: FactorRules,
): Board {
  if (
    !Number.isInteger(id) ||
    id < 1 ||
    id > rules.total ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= board.width ||
    y >= board.height ||
    board.tiles.some((t) => t.x === x && t.y === y)
  )
    return board;
  return {
    ...board,
    tiles: [...board.tiles.filter((t) => t.id !== id), { id, x, y }],
  };
}
export const remove = (board: Board, id: number): Board => ({
  ...board,
  tiles: board.tiles.filter((t) => t.id !== id),
});
export function resize(board: Board, width: number, rules: FactorRules): Board {
  if (
    !Number.isInteger(width) ||
    width < rules.widths.min ||
    width > rules.widths.max ||
    width === board.width
  )
    return board;
  const height = Math.ceil(rules.total / width);
  return {
    width,
    height,
    tiles: board.tiles.filter((t) => t.x < width && t.y < height),
  };
}
export const turn = (board: Board): Board => ({
  width: board.height,
  height: board.width,
  tiles: board.tiles.map((t) => ({ ...t, x: t.y, y: t.x })),
});
export function fillRow(board: Board, row: number, rules: FactorRules): Board {
  let next = board;
  for (let x = 0; x < board.width; x++) {
    const id = tray(next, rules)[0];
    if (id === undefined) break;
    next = place(next, id, x, row, rules);
  }
  return next;
}
