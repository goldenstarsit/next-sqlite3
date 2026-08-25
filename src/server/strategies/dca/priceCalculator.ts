export function calculateDCAPrice(
  initialEntryPrice: number,
  percentage: number,
): number {
  if (!Number.isFinite(initialEntryPrice) || initialEntryPrice <= 0) {
    throw new Error("Initial entry price must be greater than zero.");
  }

  if (!Number.isFinite(percentage) || percentage < 0 || percentage >= 100) {
    throw new Error(
      "DCA percentage must be between 0 and less than 100.",
    );
  }

  return initialEntryPrice * (1 - percentage / 100);
}
