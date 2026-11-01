import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import manifest from "./voice-manifest.json" with { type: "json" };
import { ANIMALS } from "./data";

const FILE: Record<string, string> = { cachorro: "dog", gato: "cat", vaca: "cow", pato: "duck", passarinho: "bird", sapo: "frog", ovelha: "sheep", leao: "lion", elefante: "elephant", macaco: "monkey", peixe: "fish" };

describe("animal sounds", () => {
  it("every animal in the game has its own recorded sound file", () => {
    for (const a of ANIMALS) {
      const file = FILE[a.id];
      assert.ok(file, `${a.id} has no sound`);
      const url = (manifest.animals as Record<string, string>)[file];
      assert.ok(url && existsSync(`public${url}`), `${a.id} sound file missing`);
    }
  });
});
