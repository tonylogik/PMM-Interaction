'use client';

import React, { createContext, useContext, useState } from 'react';
import { calculatePMMInteraction, computeSectionGeometry } from '../lib/compute';
import { parseSectionDataYaml } from '../lib/section';
import type { PMMResult, SectionData } from '../lib/types';

interface PMMContextValue {
  sectionData?: SectionData;
  result?: PMMResult;
  isComputing: boolean;
  error?: string;
  loadFromYaml: (text: string) => void;
  compute: () => void;
  resetError: () => void;
}

const PMMContext = createContext<PMMContextValue | undefined>(undefined);

export function PMMProvider({ children }: { children: React.ReactNode }) {
  const [sectionData, setSectionData] = useState<SectionData | undefined>();
  const [result, setResult] = useState<PMMResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isComputing, setIsComputing] = useState(false);

  const loadFromYaml = (text: string) => {
    try {
      const parsed = parseSectionDataYaml(text);
      setSectionData(parsed);
      setResult(undefined);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown YAML parsing error');
    }
  };

  const compute = () => {
    if (!sectionData) {
      setError('Please load section data before computing.');
      return;
    }
    setIsComputing(true);
    try {
      const geometry = computeSectionGeometry(sectionData);
      const computation = calculatePMMInteraction(sectionData, geometry);
      console.info(
        `%cP-range locked in: Pmin = ${computation.minP}, Pmax = ${computation.maxP}`,
        'color: #2b6cb0; font-weight: 700;'
      );
      setResult(computation);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected computation error');
    } finally {
      setIsComputing(false);
    }
  };

  const resetError = () => setError(undefined);

  return (
    <PMMContext.Provider value={{ sectionData, result, isComputing, error, loadFromYaml, compute, resetError }}>
      {children}
    </PMMContext.Provider>
  );
}

export function usePMM() {
  const context = useContext(PMMContext);
  if (!context) {
    throw new Error('usePMM must be used within a PMMProvider');
  }
  return context;
}
