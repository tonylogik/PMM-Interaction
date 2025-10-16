'use client';

import { SectionInputForm } from '../components/SectionInputForm';
import { PMM3DPlot } from '../components/PMM3DPlot';
import { PMM2DPlots } from '../components/PMM2DPlots';
import { usePMM } from '../context/pmm-context';

export default function HomePage() {
  const { result } = usePMM();

  return (
    <>
      <SectionInputForm />
      {result ? (
        <>
          <PMM3DPlot result={result} />
          <PMM2DPlots result={result} />
        </>
      ) : (
        <section>
          <h2>Awaiting launch sequence</h2>
          <p>
            Load a YAML payload and smash the compute button. We will then split polygons like a lightsaber through butter
            and crunch strain compatibility faster than a droid with fresh batteries.
          </p>
        </section>
      )}
    </>
  );
}
