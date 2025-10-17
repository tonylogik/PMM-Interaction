import type { AreaSplitResult } from './types';

type Point = [number, number];

export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function polygonArea(vertices: Point[]): number {
  if (vertices.length < 3) {
    throw new Error('Polygon must contain at least three points.');
  }
  let sum = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % vertices.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function polygonCentroid(vertices: Point[], area: number): Point {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % vertices.length];
    const factor = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * factor;
    cy += (y1 + y2) * factor;
  }
  cx /= 6 * area;
  cy /= 6 * area;
  return [cx, cy];
}

export function computeGrossCentroid(
  concreteVertices: Point[],
  rebarAreas: number[],
  rebarPositions: Point[]
): Point {
  const concreteArea = polygonArea(concreteVertices);
  const [cxConcrete, cyConcrete] = polygonCentroid(concreteVertices, concreteArea);
  const totalRebarArea = rebarAreas.reduce((acc, area) => acc + area, 0);
  const weightedX = rebarAreas.reduce((acc, area, index) => acc + area * rebarPositions[index][0], 0);
  const weightedY = rebarAreas.reduce((acc, area, index) => acc + area * rebarPositions[index][1], 0);
  const totalArea = concreteArea + totalRebarArea;
  const centroidX = (concreteArea * cxConcrete + weightedX) / totalArea;
  const centroidY = (concreteArea * cyConcrete + weightedY) / totalArea;
  return [centroidX, centroidY];
}

const EPS = 1e-9;

function evalLine(point: Point, slope: number, intercept: number): number {
  return -slope * point[0] + point[1] - intercept;
}

function interpolateIntersection(
  p1: Point,
  p2: Point,
  slope: number,
  intercept: number
): Point | null {
  const numerator = slope * p1[0] + intercept - p1[1];
  const denom = p2[1] - p1[1] - slope * (p2[0] - p1[0]);
  if (Math.abs(denom) < EPS) {
    return Math.abs(numerator) < EPS ? p2 : null;
  }
  const t = numerator / denom;
  if (t < -EPS || t > 1 + EPS) {
    return null;
  }
  const x = p1[0] + t * (p2[0] - p1[0]);
  const y = p1[1] + t * (p2[1] - p1[1]);
  return [x, y];
}

function clipHalfPlane(
  vertices: Point[],
  slope: number,
  intercept: number,
  keepTop: boolean
): Point[] {
  const clipped: Point[] = [];
  if (vertices.length === 0) {
    return clipped;
  }
  const test = (point: Point) => {
    const value = evalLine(point, slope, intercept);
    return keepTop ? value >= -EPS : value <= EPS;
  };

  for (let i = 0; i < vertices.length; i += 1) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const currentInside = test(current);
    const nextInside = test(next);

    if (currentInside && nextInside) {
      clipped.push(next);
    } else if (currentInside && !nextInside) {
      const intersection = interpolateIntersection(current, next, slope, intercept);
      if (intersection) {
        clipped.push(intersection);
      }
    } else if (!currentInside && nextInside) {
      const intersection = interpolateIntersection(current, next, slope, intercept);
      if (intersection) {
        clipped.push(intersection);
      }
      clipped.push(next);
    }
  }
  return clipped;
}

export function computeAreaOfSplitPolygon(
  polygonCoords: Point[],
  _lineCoords: Point[],
  slope: number,
  intercept: number
): AreaSplitResult {
  const lineValues = polygonCoords.map((point) => evalLine(point, slope, intercept));
  const allTop = lineValues.every((value) => value >= -EPS);
  const allBottom = lineValues.every((value) => value <= EPS);

  if (allTop || allBottom) {
    return {
      status: false,
      position1: '',
      partArea1: 0,
      xCentroid1: 0,
      yCentroid1: 0,
      position2: '',
      partArea2: 0,
      xCentroid2: 0,
      yCentroid2: 0
    };
  }

  const topPolygon = clipHalfPlane(polygonCoords, slope, intercept, true);
  const bottomPolygon = clipHalfPlane(polygonCoords, slope, intercept, false);

  const topArea = topPolygon.length >= 3 ? polygonArea(topPolygon) : 0;
  const bottomArea = bottomPolygon.length >= 3 ? polygonArea(bottomPolygon) : 0;

  const topCentroid = topArea > 0 ? polygonCentroid(topPolygon, topArea) : [0, 0];
  const bottomCentroid = bottomArea > 0 ? polygonCentroid(bottomPolygon, bottomArea) : [0, 0];

  return {
    status: topArea > 0 && bottomArea > 0,
    position1: 'top',
    partArea1: topArea,
    xCentroid1: topCentroid[0],
    yCentroid1: topCentroid[1],
    position2: 'bottom',
    partArea2: bottomArea,
    xCentroid2: bottomCentroid[0],
    yCentroid2: bottomCentroid[1]
  };
}
