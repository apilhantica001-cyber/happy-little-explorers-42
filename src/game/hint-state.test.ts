import { describe, expect, it } from "bun:test";
import { beginHint, chooseHintStyle, HINT_STYLES, isHintRunning } from "./hint-state";

describe("hint demonstration input lock", () => {
  it("blocks throughout the demonstration and releases only when finished", () => {
    const finish = beginHint();
    expect(isHintRunning()).toBe(true);
    expect(beginHint()).toBeUndefined();
    finish?.();
    expect(isHintRunning()).toBe(false);
  });
  it("an old cleanup cannot unlock a newer demonstration", () => {
    const oldFinish = beginHint();
    oldFinish?.();
    const finish = beginHint();
    oldFinish?.();
    expect(isHintRunning()).toBe(true);
    finish?.();
    expect(isHintRunning()).toBe(false);
  });
  it("varies all five requested styles without immediate repetition", () => {
    expect(Array.from({ length: 5 }, chooseHintStyle)).toEqual(["rocket", "archery", "sunflower", "parachute", "stars"]);
    expect(HINT_STYLES.length).toBe(5);
  });
});