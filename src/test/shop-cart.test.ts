import { describe, expect, it } from "vitest";

import { getCartLines } from "@/lib/shop-cart";

describe("shop cart", () => {
  it("calculates quantities, bulk prices, and totals for multiple products", () => {
    const products = [
      {
        n: "Boxer homme",
        pack: {
          units: 50,
          tiers: [
            [1, 170],
            [5, 150],
          ] as [number, number][],
        },
      },
      {
        n: "String femme",
        pack: {
          units: 100,
          tiers: [
            [1, 150],
            [5, 140],
          ] as [number, number][],
        },
      },
      { n: "Bonnet jetable" },
    ];

    expect(
      getCartLines(
        products,
        new Map([
          [0, 5],
          [1, 2],
          [2, 1],
        ]),
      ),
    ).toEqual([
      {
        productIndex: 0,
        product: products[0],
        quantity: 5,
        units: 250,
        unitsPerPack: 50,
        unitPrice: 150,
        lineTotal: 750,
      },
      {
        productIndex: 1,
        product: products[1],
        quantity: 2,
        units: 200,
        unitsPerPack: 100,
        unitPrice: 150,
        lineTotal: 300,
      },
    ]);
  });
});
