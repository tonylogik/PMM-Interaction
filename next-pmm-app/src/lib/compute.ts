import { linspace } from './math';
import { computeAreaOfSplitPolygon, computeGrossCentroid, polygonArea } from './geometry';
import type {
  ComputedGeometry,
  PMMAlphaResult,
  PMMResult,
  SectionClassification,
  SectionData
} from './types';

export type Point = [number, number];

interface DistResult {
  dist: number;
  position: 'top' | 'bottom';
}

function distFromLine(line: [number, number], point: Point): DistResult {
  const [m, intercept] = line;
  const numerator = -m * point[0] + point[1] - intercept;
  const denominator = Math.hypot(m, 1);
  return {
    dist: Math.abs(numerator) / denominator,
    position: numerator >= 0 ? 'top' : 'bottom'
  };
}

function cornerChange(
  data: SectionData,
  cline: [number, number],
  corner: Point,
  concPressure: 'top' | 'bottom'
): { changed: boolean; corner: Point } {
  const baseDistance = distFromLine(cline, corner).dist;
  let newCorner = corner;
  let changed = false;
  data.cornerCoordinates.forEach(([x, y]) => {
    const info = distFromLine(cline, [x, y]);
    if (info.position === concPressure && info.dist > baseDistance + 1e-9) {
      newCorner = [x, y];
      changed = true;
    }
  });
  return { changed, corner: newCorner };
}

export function computeSectionGeometry(data: SectionData): ComputedGeometry {
  const width =
    Math.max(...data.cCorners.map((idx) => data.cornerCoordinates[idx][0])) -
    Math.min(...data.cCorners.map((idx) => data.cornerCoordinates[idx][0]));
  const depth =
    Math.max(...data.cCorners.map((idx) => data.cornerCoordinates[idx][1])) -
    Math.min(...data.cCorners.map((idx) => data.cornerCoordinates[idx][1]));
  const centroid = computeGrossCentroid(data.cornerCoordinates, data.bar_areas, data.bar_positions);
  const grossArea = polygonArea(data.cornerCoordinates);
  const steelArea = data.bar_areas.reduce((acc, area) => acc + area, 0);
  const epsilonY = data.fy / data.Es;
  return { width, depth, centroid, grossArea, steelArea, epsilonY };
}

export function calculatePMMInteraction(data: SectionData, geometry: ComputedGeometry): PMMResult {
  const { width: b, depth: h, centroid, grossArea: Ag, steelArea: Ast, epsilonY } = geometry;
  const cMin = 0.001;
  const cMax = h * 10;
  const cList = linspace(cMin, cMax, data.numberofPoints);
  const alphaCount = Math.max(1, Math.floor(360 / data.alphaSteps));
  const alphaList = linspace(0, (8 * Math.PI) / 4, alphaCount);

  const series: PMMAlphaResult[] = [];
  const allP: number[] = [];

  for (const alphaRaw of alphaList) {
    let alpha = alphaRaw;
    if (Math.abs(alpha - Math.PI / 2) < 0.001 || Math.abs(alpha - (3 * Math.PI) / 2) < 0.001) {
      alpha *= 0.98;
    }

    const slope = Math.tan(alpha);
    const cosAlpha = Math.cos(alpha);
    if (Math.abs(cosAlpha) < 1e-6) {
      continue;
    }

    let corner: Point;
    if (alpha < Math.PI / 2) {
      corner = data.cornerCoordinates[data.cCorners[3]];
    } else if (alpha >= Math.PI / 2 && alpha < Math.PI) {
      corner = data.cornerCoordinates[data.cCorners[0]];
    } else if (alpha >= Math.PI && alpha < (3 * Math.PI) / 2) {
      corner = data.cornerCoordinates[data.cCorners[1]];
    } else {
      corner = data.cornerCoordinates[data.cCorners[2]];
    }

    let runStatus = true;
    const PAlpha: number[] = [];
    const MxAlpha: number[] = [];
    const MyAlpha: number[] = [];
    const cAlpha: number[] = [];
    const epsilonAlpha: number[] = [];
    const alphaSeries: number[] = [];
    const sectionStatus: SectionClassification[] = [];

    while (runStatus) {
      runStatus = false;
      const PList: number[] = [];
      const MxList: number[] = [];
      const MyList: number[] = [];
      const ciList: number[] = [];
      const epsilonList: number[] = [];
      const statusList: SectionClassification[] = [];

      for (const c of cList) {
        const a = data.beta1 * c;
        const y0a = corner[1] - a / cosAlpha - corner[0] * slope;
        const y0c = corner[1] - c / cosAlpha - corner[0] * slope;
        const cline: [number, number] = [slope, y0c];
        const lineNodes: Point[] = [
          [-b, -b * slope + y0a],
          [2 * b, 2 * b * slope + y0a]
        ];

        const areaData = computeAreaOfSplitPolygon(data.cornerCoordinates, lineNodes, slope, y0a);

        let concPressure: 'top' | 'bottom';
        if (alpha <= Math.PI / 2) {
          concPressure = 'top';
        } else if (alpha > Math.PI / 2 && alpha < (3 * Math.PI) / 2) {
          concPressure = 'bottom';
        } else {
          concPressure = 'top';
        }

        let compArea = areaData.status
          ? areaData.position1 === concPressure
            ? areaData.partArea1
            : areaData.partArea2
          : Ag;
        const Xc = areaData.status
          ? areaData.position1 === concPressure
            ? areaData.xCentroid1
            : areaData.xCentroid2
          : centroid[0];
        const Yc = areaData.status
          ? areaData.position1 === concPressure
            ? areaData.yCentroid1
            : areaData.yCentroid2
          : centroid[1];

        const cornerShift = cornerChange(data, cline, corner, concPressure);
        if (cornerShift.changed) {
          corner = cornerShift.corner;
          runStatus = true;
          break;
        }

        let PSteel = 0;
        let MxSteel = 0;
        let MySteel = 0;
        const epsilonSteel: number[] = [];

        data.bar_positions.forEach((pi, index) => {
          const Asi = data.bar_areas[index];
          const info = distFromLine(cline, pi);
          const epsilonI = info.position === concPressure ? (0.003 * info.dist) / c : (-0.003 * info.dist) / c;
          if (info.position === concPressure) {
            compArea -= Asi;
          }
          const stress = Math.abs(epsilonI) < epsilonY ? data.Es * epsilonI : data.fy * Math.sign(epsilonI);
          const Fsi = Asi * stress;
          PSteel += Fsi;
          MxSteel += Fsi * (pi[0] - centroid[0]);
          MySteel += Fsi * (pi[1] - centroid[1]);
          epsilonSteel.push(epsilonI);
        });

        const concreteForce = 0.85 * data.fc * compArea;
        const concreteMomentX = concreteForce * (Xc - centroid[0]);
        const concreteMomentY = concreteForce * (Yc - centroid[1]);
        let Pn = concreteForce + PSteel;
        let Mnx = concreteMomentX + MxSteel;
        let Mny = concreteMomentY + MySteel;

        const PnMaxACI = 0.8 * (0.85 * data.fc * (Ag - Ast) + data.fy * Ast);
        if (Pn > PnMaxACI) {
          Pn = PnMaxACI;
          Mnx = 0;
          Mny = 0;
        }

        const epsilonTMax = Math.min(...epsilonSteel);
        let phi = 1;
        if (data.includePhiFactors) {
          if (epsilonTMax > -epsilonY) {
            phi = 0.65;
          } else if (epsilonTMax < -epsilonY && epsilonTMax > -(epsilonY + 0.003)) {
            phi = 0.65 + ((-epsilonTMax - 0.002) * 0.25) / 0.003;
          } else if (epsilonTMax < -(epsilonY + 0.003)) {
            phi = 0.9;
          } else {
            phi = 0.65;
          }
        }

        const sectionClass: SectionClassification = epsilonTMax >= -epsilonY ? 'CC' : epsilonTMax <= -epsilonY ? 'TC' : 'TZ';

        const designP = phi * Pn;
        const designMx = phi * Mnx;
        const designMy = phi * Mny;

        PList.push(Number(designP.toFixed(2)));
        MxList.push(Number(designMx.toFixed(2)));
        MyList.push(Number(designMy.toFixed(2)));
        ciList.push(Number(c.toFixed(2)));
        epsilonList.push(Number(Math.min(epsilonTMax, -2 * 0.005).toFixed(5)));
        statusList.push(sectionClass);
      }

      if (runStatus) {
        continue;
      }

      PAlpha.push(...PList);
      MxAlpha.push(...MxList);
      MyAlpha.push(...MyList);
      cAlpha.push(...ciList);
      epsilonAlpha.push(...epsilonList);
      alphaSeries.push(...ciList.map(() => Number(alpha.toFixed(3))));
      sectionStatus.push(...statusList);
    }

    PAlpha.forEach((value) => allP.push(value));
    series.push({
      alpha,
      P: PAlpha,
      Mx: MxAlpha,
      My: MyAlpha,
      c: cAlpha,
      epsilonT: epsilonAlpha,
      alphaSeries,
      sectionStatus
    });
  }

  const minP = Math.min(...allP);
  const maxP = Math.max(...allP);

  return { series, minP, maxP };
}
