declare module 'd3-force-3d' {
  export interface ForceCollide {
    radius(value: number | ((node: any) => number)): ForceCollide;
    strength(value: number): ForceCollide;
    iterations(value: number): ForceCollide;
  }

  export function forceCollide<T = any>(
    radius?: number | ((node: T) => number)
  ): ForceCollide;
}
