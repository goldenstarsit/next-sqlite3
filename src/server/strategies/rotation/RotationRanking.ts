export interface RotationCandidate {
  symbol: string;
  variationPercent: number;
  takeProfitProbability: number;
  score: number;
}

export class RotationRanking {
  rank(
    candidates: RotationCandidate[],
    variationWeight: number,
    takeProfitProbabilityWeight: number,
  ): RotationCandidate[] {
    return [...candidates]
      .map((candidate) => ({
        ...candidate,
        score:
          this.normalizeVariation(
            candidate.variationPercent,
          ) * variationWeight +
          candidate.takeProfitProbability *
            takeProfitProbabilityWeight,
      }))
      .sort(
        (a, b) =>
          b.score - a.score,
      );
  }

  private normalizeVariation(
    variation: number,
  ): number {
    /*
     * Positive variation is preferred.
     * Negative variation is therefore naturally penalized.
     */
    return Math.max(
      0,
      Math.min(
        1,
        variation / 100,
      ),
    );
  }
}
