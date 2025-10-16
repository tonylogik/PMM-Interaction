import {
  area as turfArea,
  centroid as turfCentroid,
  lineString as turfLineString,
  polygon as turfPolygon,
  polygonSplit,
  booleanIntersects
} from '@turf/turf';
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

function classifyRelativeToLine(point: Point, slope: number, intercept: number): 'top' | 'bottom' {
  const value = -slope * point[0] + point[1] - intercept;
  return value >= 0 ? 'top' : 'bottom';
}

export function computeAreaOfSplitPolygon(
  polygonCoords: Point[],
  lineCoords: Point[],
  slope: number,
  intercept: number
): AreaSplitResult {
  const closedPolygon = [...polygonCoords, polygonCoords[0]];
  const polygon = turfPolygon([closedPolygon.map(([x, y]) => [x, y])]);
  const line = turfLineString(lineCoords.map(([x, y]) => [x, y]));

  if (!booleanIntersects(line, polygon)) {
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

  const split = polygonSplit(polygon, line);
  if (!split || !split.features.length) {
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

  const topParts = { area: 0, xc: 0, yc: 0 };
  const bottomParts = { area: 0, xc: 0, yc: 0 };

  split.features.forEach((feature) => {
    const area = turfArea(feature);
    if (area === 0) {
      return;
    }
    const centroid = turfCentroid(feature).geometry.coordinates as [number, number];
    const bucket = classifyRelativeToLine(centroid, slope, intercept) === 'top' ? topParts : bottomParts;
    const totalArea = bucket.area + area;
    bucket.xc = totalArea === 0 ? centroid[0] : (bucket.xc * bucket.area + area * centroid[0]) / totalArea;
    bucket.yc = totalArea === 0 ? centroid[1] : (bucket.yc * bucket.area + area * centroid[1]) / totalArea;
    bucket.area = totalArea;
  });

  return {
    status: true,
    position1: 'top',
    partArea1: topParts.area,
    xCentroid1: topParts.xc,
    yCentroid1: topParts.yc,
    position2: 'bottom',
    partArea2: bottomParts.area,
    xCentroid2: bottomParts.xc,
    yCentroid2: bottomParts.yc
  };
}
