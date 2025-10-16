import yaml from 'js-yaml';
import { distance, polygonArea, polygonCentroid } from './geometry';
import type { SectionData } from './types';

type Point = [number, number];

interface RawSectionData {
  fc: number;
  fy: number;
  Es: number;
  alphaSteps: number;
  numberofPoints: number;
  includePhiFactors: boolean;
  cover: number;
  concreteSectionCoordinates: Point[];
  bar_diameters: number[][];
  bar_positions: Point[];
  bar_areas: number[][];
}

interface CoordinateModifierResult {
  cornerCoordinates: Point[];
  barCoordinates: Point[];
  cCorners: number[];
}

function coordinateModifier(data: RawSectionData): CoordinateModifierResult {
  if (!data.concreteSectionCoordinates.length) {
    throw new Error('Concrete polygon coordinates are empty.');
  }

  const xmin = Math.min(...data.concreteSectionCoordinates.map((pt) => pt[0]));
  const ymin = Math.min(...data.concreteSectionCoordinates.map((pt) => pt[1]));
  const cornerCoordinates = data.concreteSectionCoordinates.map((point) => [point[0] - xmin, point[1] - ymin] as Point);
  const barCoordinates = data.bar_positions.map((point) => [point[0] - xmin, point[1] - ymin] as Point);

  const concreteArea = polygonArea(cornerCoordinates);
  const concreteCentroid = polygonCentroid(cornerCoordinates, concreteArea);

  const quadrants: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', Point[]> = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: []
  };

  cornerCoordinates.forEach((point) => {
    const [x, y] = point;
    const [cx, cy] = concreteCentroid;
    if (x >= cx && y >= cy) {
      quadrants.Q1.push(point);
    } else if (x < cx && y >= cy) {
      quadrants.Q2.push(point);
    } else if (x < cx && y < cy) {
      quadrants.Q3.push(point);
    } else {
      quadrants.Q4.push(point);
    }
  });

  const farthestPoints: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', Point>> = {};
  (Object.keys(quadrants) as Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>).forEach((quadrant) => {
    const pts = quadrants[quadrant];
    if (!pts.length) {
      return;
    }
    const farthest = pts.reduce((best, pt) => {
      if (!best) return pt;
      return distance(pt, concreteCentroid) > distance(best, concreteCentroid) ? pt : best;
    }, pts[0]);
    farthestPoints[quadrant] = farthest;
  });

  const cCorners: number[] = [];
  cornerCoordinates.forEach((corner, index) => {
    if (farthestPoints.Q3 && corner === farthestPoints.Q3) cCorners.push(index);
    if (farthestPoints.Q4 && corner === farthestPoints.Q4) cCorners.push(index);
    if (farthestPoints.Q1 && corner === farthestPoints.Q1) cCorners.push(index);
    if (farthestPoints.Q2 && corner === farthestPoints.Q2) cCorners.push(index);
  });

  return { cornerCoordinates, barCoordinates, cCorners };
}

export function parseSectionDataYaml(text: string): SectionData {
  const data = yaml.load(text) as RawSectionData;
  if (!data) {
    throw new Error('Invalid YAML payload.');
  }

  const { cornerCoordinates, barCoordinates, cCorners } = coordinateModifier(data);
  const beta1Raw = data.fc <= 4 ? 0.85 : 0.85 - 0.05 * (data.fc - 4);
  const beta1 = Math.max(beta1Raw, 0.65);

  return {
    fc: data.fc,
    fy: data.fy,
    Es: data.Es,
    alphaSteps: data.alphaSteps,
    numberofPoints: data.numberofPoints,
    beta1,
    cornerCoordinates,
    includePhiFactors: data.includePhiFactors,
    cover: data.cover,
    bar_diameters: data.bar_diameters[0],
    bar_positions: barCoordinates,
    bar_areas: data.bar_areas[0],
    cCorners
  };
}
