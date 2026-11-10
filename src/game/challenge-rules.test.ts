import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { challengeConfig, nextCombo, pointsFor } from "./challenge-rules";

describe("Céu Mágico challenges", () => {
  it("each level needs more points than the previous", () => {
    assert.equal(challengeConfig("facil").goal, 15);
    assert.equal(challengeConfig("medio").goal, 25);
    assert.equal(challengeConfig("dificil").goal, 40);
  });
  it("harder levels are faster", () => {
    assert.ok(challengeConfig("dificil").speed > challengeConfig("medio").speed);
    assert.ok(challengeConfig("medio").speed > challengeConfig("facil").speed);
  });
  it("a miss resets the combo but never removes points", () => {
    assert.equal(nextCombo(7, false), 0);
    assert.ok(pointsFor(0) >= 0);
  });
  it("every 5th hit in a row is worth 2", () => {
    assert.equal(pointsFor(5), 2);
    assert.equal(pointsFor(4), 1);
  });
});
