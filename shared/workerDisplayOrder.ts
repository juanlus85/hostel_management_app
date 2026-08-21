export function displayOrderUpdates(userIds: number[]) {
  return userIds.map((id, index) => ({ id, displayOrder: index + 1 }));
}

export function moveIdInOrder(ids: number[], id: number, direction: -1 | 1): number[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
