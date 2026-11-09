import { describe, expect, it } from "vitest";
import { challengeConfig, nextCombo, pointsFor } from "./challenge-rules";

describe("Céu Mágico challenges", () => {
  it("each level needs more points than the previous", () => {
    expect(challengeConfig("facil").goal).toBe(15);
    expect(challengeConfig("medio").goal).toBe(25);
    expect(challengeConfig("dificil").goal).toBe(40);
  });
  it("harder levels are faster", () => {
    expect(challengeConfig("dificil").speed).toBeGreaterThan(challengeConfig("medio").speed);
    expect(challengeConfig("medio").speed).toBeGreaterThan(challengeConfig("facil").speed);
  });
  it("a miss resets the combo but never removes points", () => {
    expect(nextCombo(7, false)).toBe(0);
    expect(pointsFor(0)).toBeGreaterThanOrEqual(0);
  });
  it("every 5th hit in a row is worth 2", () => {
    expect(pointsFor(5)).toBe(2);
    expect(pointsFor(4)).toBe(1);
  });
});
