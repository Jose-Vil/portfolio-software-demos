import test from "node:test";
import assert from "node:assert/strict";
import {
  areAllCosmosGiftsDelivered,
  isCosmosFinalGiftUnlocked,
  persistCosmosFinalGiftUnlock,
} from "../src/components/universe/cosmos-gift-progress.ts";

test("an incomplete or empty collection cannot unlock completion", () => {
  assert.equal(areAllCosmosGiftsDelivered({}, []), false);
  assert.equal(
    areAllCosmosGiftsDelivered({ one: true }, ["one", "two"]),
    false,
  );
  assert.equal(areAllCosmosGiftsDelivered({ one: "true" }, ["one"]), false);
  assert.equal(
    areAllCosmosGiftsDelivered({ one: true, two: true }, ["one", "two"]),
    true,
  );
});

test("completion survives changes to the visible collection", () => {
  const store = new Map();
  const events = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    },
    dispatchEvent: (event) => events.push(event.type),
  };
  try {
    assert.equal(isCosmosFinalGiftUnlocked(), false);
    assert.equal(persistCosmosFinalGiftUnlock(), true);
    assert.equal(isCosmosFinalGiftUnlocked(), true);
    assert.equal(areAllCosmosGiftsDelivered({ one: false }, ["one"]), false);
    assert.equal(isCosmosFinalGiftUnlocked(), true);
    assert.equal(events.length, 1);
    assert.ok([...store.keys()].every((key) => key.startsWith("portfolio:")));
  } finally {
    delete globalThis.window;
  }
});

test("blocked storage does not crash exploration", () => {
  globalThis.window = {
    get localStorage() {
      throw new Error("Storage blocked");
    },
  };
  try {
    assert.equal(isCosmosFinalGiftUnlocked(), false);
    assert.equal(persistCosmosFinalGiftUnlock(), false);
  } finally {
    delete globalThis.window;
  }
});
