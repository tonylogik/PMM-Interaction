export interface SectionData {
  cornerCoordinates: [number, number][];
  fc: number;
  fy: number;
  Es: number;
  alphaSteps: number;
  numberofPoints: number;
  beta1: number;
  includePhiFactors: boolean;
  cover: number;
  bar_diameters: number[];
  bar_positions: [number, number][];
  bar_areas: number[];
  cCorners: number[];
}

export interface ComputedGeometry {
  width: number;
  depth: number;
  centroid: [number, number];
  grossArea: number;
  steelArea: number;
  epsilonY: number;
}

export type SectionClassification = 'CC' | 'TC' | 'TZ';

export interface PMMAlphaResult {
  alpha: number;
  P: number[];
  Mx: number[];
  My: number[];
  c: number[];
  epsilonT: number[];
  alphaSeries: number[];
  sectionStatus: SectionClassification[];
}

export interface PMMResult {
  series: PMMAlphaResult[];
  minP: number;
  maxP: number;
}

export interface AreaSplitResult {
  status: boolean;
  position1: 'top' | 'bottom' | '';
  partArea1: number;
  xCentroid1: number;
  yCentroid1: number;
  position2: 'top' | 'bottom' | '';
  partArea2: number;
  xCentroid2: number;
  yCentroid2: number;
}

export interface PMMComputationBundle {
  inputs: SectionData;
  geometry: ComputedGeometry;
  result: PMMResult;
}
