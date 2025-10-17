'use client';

import { useEffect, useState } from 'react';
import { usePMM } from '../context/pmm-context';

export function SectionInputForm() {
  const { loadFromYaml, compute, error, resetError, isComputing, sectionData } = usePMM();
  const [yamlText, setYamlText] = useState('');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => resetError(), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, resetError]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setYamlText(text);
      loadFromYaml(text);
    } catch (err) {
      console.error('File reading malfunction:', err);
    }
  };

  const handleLoadSample = async () => {
    try {
      const response = await fetch('/sectionData.yaml');
      const text = await response.text();
      setYamlText(text);
      loadFromYaml(text);
    } catch (err) {
      console.error('Sample fetch misfire:', err);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (yamlText.trim().length === 0) {
      console.warn('YAML void detected: please upload or paste data.');
      return;
    }
    loadFromYaml(yamlText);
    compute();
  };

  return (
    <section>
      <h1>PMM Interaction Explorer</h1>
      <p>
        Welcome, structural adventurer! Feed the algorithm a YAML section definition and it will forge 3D and 2D PMM
        diagrams faster than you can say “neutral axis realignment”.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="section-file">Upload sectionData.yaml</label>
        <input id="section-file" type="file" accept=".yaml,.yml" onChange={handleFileChange} />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleLoadSample}>
            Beam me the sample YAML
          </button>
          <button type="submit" disabled={isComputing}>
            {isComputing ? 'Crunching numbers…' : 'Compute interaction magic'}
          </button>
        </div>
        <label htmlFor="yaml-input" style={{ marginTop: '1.5rem' }}>
          Paste or tweak YAML payload (beware: tampering with physics may summon surprise infinities)
        </label>
        <textarea
          id="yaml-input"
          rows={16}
          value={yamlText}
          onChange={(event) => setYamlText(event.target.value)}
          spellCheck={false}
        />
      </form>
      {sectionData && (
        <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
          Current payload locked and loaded. Concrete centroid ready at warp speed.
        </p>
      )}
      {error && (
        <p style={{ color: '#c53030', fontWeight: 700 }}>Warning from mission control: {error}</p>
      )}
    </section>
  );
}
