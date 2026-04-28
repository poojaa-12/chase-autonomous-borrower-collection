import { describe, expect, it } from "vitest";
import { functions } from "./index";

describe("inngest function registry", () => {
  it("exports at least one function handler", () => {
    expect(Array.isArray(functions)).toBe(true);
    expect(functions.length).toBeGreaterThan(0);
  });
});
