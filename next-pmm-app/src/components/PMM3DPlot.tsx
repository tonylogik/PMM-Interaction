'use client';

import dynamic from 'next/dynamic';
import type { Data, Layout } from 'plotly.js';
import type { PMMResult } from '../lib/types';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PMM3DPlotProps {
  result: PMMResult;
}

export function PMM3DPlot({ result }: PMM3DPlotProps) {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  const hoverC: number[] = [];
  const epsilon: number[] = [];
  const alphaTrack: number[] = [];
  const status: string[] = [];

  result.series.forEach((series) => {
    x.push(...series.Mx);
    y.push(...series.My);
    z.push(...series.P);
    hoverC.push(...series.c);
    epsilon.push(...series.epsilonT);
    alphaTrack.push(...series.alphaSeries);
    status.push(...series.sectionStatus);
  });

  const data: Data[] = [
    {
      type: 'scatter3d',
      mode: 'lines+markers',
      x,
      y,
      z,
      marker: {
        size: 3,
        color: z,
        colorscale: 'Viridis',
        opacity: 0.8
      },
      text: hoverC,
      customdata: epsilon.map((value, index) => [value, alphaTrack[index], status[index]]),
      hovertemplate:
        'P: %{z}<br>' +
        'Mx: %{x}<br>' +
        'My: %{y}<br>' +
        'epsilon_t: %{customdata[0]}<br>' +
        'c: %{text}<br>' +
        'alpha: %{customdata[1]}<br>' +
        'SecStatus: %{customdata[2]}<br>' +
        '<extra></extra>'
    }
  ];

  const layout: Partial<Layout> = {
    title:
      'P-M-M Interaction Curve (ACI 318-19), Reinforced Concrete Section — now rendered in glorious web shaders',
    scene: {
      xaxis: {
        title: 'Mx (kips-in)',
        showgrid: true,
        gridcolor: 'gray',
        gridwidth: 2,
        titlefont: { family: 'Courier New', size: 24, color: 'black' }
      },
      yaxis: {
        title: 'My (kips-in)',
        showgrid: true,
        gridcolor: 'gray',
        gridwidth: 2,
        titlefont: { family: 'Courier New', size: 24, color: 'black' }
      },
      zaxis: {
        title: 'P (kips)',
        showgrid: true,
        gridcolor: 'gray',
        gridwidth: 2,
        titlefont: { family: 'Courier New', size: 24, color: 'black' }
      }
    },
    hoverlabel: {
      font: {
        size: 18,
        family: 'Courier New',
        color: 'black'
      }
    },
    margin: { l: 0, r: 0, t: 60, b: 0 }
  };

  return (
    <section>
      <h2>3D Interaction Surface</h2>
      <p>Plotting reinforced concrete fortunes — like the Millennium Falcon, but for axial loads.</p>
      <div className="plot-wrapper">
        <Plot data={data} layout={layout} style={{ width: '100%', height: '600px' }} />
      </div>
    </section>
  );
}
