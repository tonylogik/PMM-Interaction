'use client';

import dynamic from 'next/dynamic';
import type { Data, Layout } from 'plotly.js';
import type { PMMResult } from '../lib/types';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PMM2DPlotsProps {
  result: PMMResult;
}

export function PMM2DPlots({ result }: PMM2DPlotsProps) {
  const alphaList = result.series.map((series) => series.alpha);
  const targetAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const targetIndices = targetAngles.map((target) => {
    let bestIndex = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    alphaList.forEach((alpha, index) => {
      const delta = Math.abs(alpha - target);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = index;
      }
    });
    return bestIndex;
  });

  const data: Data[] = [];
  const layout: Partial<Layout> = {
    title:
      'P-M-M Interaction Curve (ACI 318-19) — cross-sections of the surface for every quadrant of the galaxy',
    grid: { rows: 4, columns: 3, pattern: 'independent' },
    height: 1100,
    margin: { l: 60, r: 20, t: 60, b: 40 }
  };

  targetIndices.forEach((seriesIndex, row) => {
    const series = result.series[seriesIndex];
    const angleDeg = Number(((series.alpha * 180) / Math.PI).toFixed(1));

    const axisIndexFor = (axisRow: number, column: number) => {
      const idx = axisRow * 3 + column + 1;
      return idx === 1 ? '' : `${idx}`;
    };

    const registerAxis = (axisRow: number, column: number, title: string, yTitle: string) => {
      const suffix = axisIndexFor(axisRow, column);
      const xAxisKey = `xaxis${suffix}` as keyof Layout;
      const yAxisKey = `yaxis${suffix}` as keyof Layout;
      (layout as Layout)[xAxisKey] = {
        title,
        titlefont: { family: 'serif', color: 'darkred', size: 12 }
      } as Layout['xaxis'];
      (layout as Layout)[yAxisKey] = {
        title: yTitle,
        titlefont: { family: 'serif', color: 'darkred', size: 12 }
      } as Layout['yaxis'];
    };

    const firstColumnTitle = row === 0 || row === 2 ? 'Design Moment - My (kips-in)' : 'Design Moment - Mx (kips-in)';
    registerAxis(row, 0, firstColumnTitle, 'Axial Load (kips)');
    registerAxis(row, 1, 'Neutral Axis Depth - c (in)', 'Axial Load (kips)');
    registerAxis(row, 2, 'Maximum Tensile Strain - epsilon-t', 'Axial Load (kips)');

    const suffix = (column: number) => axisIndexFor(row, column);

    data.push({
      type: 'scatter',
      mode: 'lines',
      x: row === 0 || row === 2 ? series.My : series.Mx,
      y: series.P,
      name: `${row === 0 || row === 2 ? 'P vs My' : 'P vs Mx'}, θ = ${angleDeg}°`,
      xaxis: `x${suffix(0)}`,
      yaxis: `y${suffix(0)}`
    });

    data.push({
      type: 'scatter',
      mode: 'lines',
      x: series.c,
      y: series.P,
      name: `P vs c, θ = ${angleDeg}°`,
      xaxis: `x${suffix(1)}`,
      yaxis: `y${suffix(1)}`
    });

    data.push({
      type: 'scatter',
      mode: 'lines',
      x: series.epsilonT,
      y: series.P,
      name: `P vs epsilon-t, θ = ${angleDeg}°`,
      xaxis: `x${suffix(2)}`,
      yaxis: `y${suffix(2)}`
    });
  });

  return (
    <section>
      <h2>2D Diagnostics</h2>
      <p>
        Slicing the interaction surface at quadrantal bearings — like taking MRI scans of a concrete Jedi.
      </p>
      <div className="plot-wrapper">
        <Plot data={data} layout={layout} style={{ width: '100%', height: '1100px' }} />
      </div>
    </section>
  );
}
