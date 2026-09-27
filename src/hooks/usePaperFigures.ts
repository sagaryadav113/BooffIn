import { useState, useEffect } from 'react';
import { Paper, PaperFigure } from '../types';
import { resolvePaperFigures } from '../api/paper/figureResolver';

export function usePaperFigures(paper?: Paper | null): PaperFigure[] {
  const [figures, setFigures] = useState<PaperFigure[]>(() => {
    if (paper?.figures && paper.figures.length > 0) {
      return paper.figures;
    }
    return [];
  });

  useEffect(() => {
    if (!paper) {
      setFigures([]);
      return;
    }

    if (paper.figures && paper.figures.length > 0) {
      setFigures(paper.figures);
      return;
    }

    let isMounted = true;

    resolvePaperFigures({
      doi: paper.doi,
      canonicalUrl: paper.canonicalUrl,
      title: paper.title,
      journal: typeof paper.journal === 'string' ? paper.journal : undefined,
    }).then((resolved) => {
      if (isMounted && resolved && resolved.length > 0) {
        setFigures(resolved);
        // Mutate in-memory paper reference so other components don't re-fetch
        paper.figures = resolved;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [paper?.id, paper?.doi, paper?.canonicalUrl]);

  return figures;
}
