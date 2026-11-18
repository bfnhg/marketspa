import { describe, expect, it } from "vitest";

import { formatPdfDh } from "@/lib/money";

describe("PDF amount formatting", () => {
  it("uses a dot as the thousands separator", () => {
    expect(formatPdfDh(3980)).toBe("3.980 DH");
  });
});
