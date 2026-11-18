export function formatDh(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DH`;
}

export function formatPdfDh(amount: number) {
  const groupedAmount = amount.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, ".");
  return `${groupedAmount} DH`;
}
