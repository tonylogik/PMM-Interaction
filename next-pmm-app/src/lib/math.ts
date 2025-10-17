export function linspace(start: number, stop: number, count: number): number[] {
  if (count <= 1) {
    return [start];
  }
  const step = (stop - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + index * step);
}
