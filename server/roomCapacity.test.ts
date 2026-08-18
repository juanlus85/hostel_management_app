import { describe, expect, it } from "vitest";
import { defaultGuestsForRoomType } from "../shared/roomCapacity";

describe("defaultGuestsForRoomType", () => {
  it("defaults double and twin rooms to two guests", () => {
    expect(defaultGuestsForRoomType("Habitación Doble")).toBe(2);
    expect(defaultGuestsForRoomType("Twin beds Room")).toBe(2);
  });

  it("detects triple and quadruple capacities", () => {
    expect(defaultGuestsForRoomType("Triple room")).toBe(3);
    expect(defaultGuestsForRoomType("Habitación Cuádruple")).toBe(4);
  });
});
