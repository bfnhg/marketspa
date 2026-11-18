export type CartPack = { units: number; tiers: [number, number][] };
export type CartProduct = { n: string; pack?: CartPack; details?: string };
export const OPEN_QUOTE_EVENT = "marketspa:open-quote";
export type CartLine = {
  productIndex: number;
  product: CartProduct;
  quantity: number;
  units: number;
  unitsPerPack: number;
  unitPrice: number;
  lineTotal: number;
};

export function priceFor(pack: CartPack, quantity: number) {
  return pack.tiers.reduce(
    (price, [minimum, tierPrice]) => (quantity >= minimum ? tierPrice : price),
    pack.tiers[0]![1],
  );
}

export function getCartLines(
  products: readonly CartProduct[],
  quantities: ReadonlyMap<number, number>,
): CartLine[] {
  const lines: CartLine[] = [];

  for (const [productIndex, quantity] of quantities) {
    const product = products[productIndex];
    const pack = product?.pack;
    if (!product || !pack || quantity <= 0) continue;

    const unitPrice = priceFor(pack, quantity);
    lines.push({
      productIndex,
      product,
      quantity,
      units: quantity * pack.units,
      unitsPerPack: pack.units,
      unitPrice,
      lineTotal: quantity * unitPrice,
    });
  }

  return lines;
}
