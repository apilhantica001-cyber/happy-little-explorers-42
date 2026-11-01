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
  it("picks hint styles at random and never repeats the same one twice in a row", () => {
    const seen = new Set<string>();
    let prev = "";
    for (let i = 0; i < 200; i++) {
      const style = chooseHintStyle();
      assert.notEqual(style, prev);
      prev = style;
      seen.add(style);
    }
    assert.equal(seen.size, HINT_STYLES.length);
  });
  it("order is not a fixed rotation", () => {
    const a = Array.from({ length: 5 }, () => chooseHintStyle(() => 0));
    assert.notDeepEqual(a, ["rocket", "archery", "sunflower", "parachute", "stars"]);
  });
});
