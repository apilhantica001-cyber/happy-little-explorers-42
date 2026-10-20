import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beginHint, chooseHintStyle, HINT_STYLES, isHintRunning } from "./hint-state";

describe("hint demonstration input lock", () => {
  it("blocks throughout the demonstration and releases only when finished", () => {
    const finish = beginHint();
    assert.equal(isHintRunning(), true);
    assert.equal(beginHint(), undefined);
    finish?.();
    assert.equal(isHintRunning(), false);
  });
  it("an old cleanup cannot unlock a newer demonstration", () => {
    const oldFinish = beginHint();
    oldFinish?.();
    const finish = beginHint();
    oldFinish?.();
    assert.equal(isHintRunning(), true);
    finish?.();
    assert.equal(isHintRunning(), false);
  });
  it("varies all five requested styles without immediate repetition", () => {
    assert.deepEqual(Array.from({ length: 5 }, chooseHintStyle), ["rocket", "archery", "sunflower", "parachute", "stars"]);
    assert.equal(HINT_STYLES.length, 5);
  });
});