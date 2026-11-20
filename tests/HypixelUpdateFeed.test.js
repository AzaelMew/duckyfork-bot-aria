/* eslint-env jest */

const {
  collectRecentUnseenItems,
  HYPIXEL_POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  shouldPollHypixelNews,
} = require("../src/minecraft/other/hypixelUpdateFeed.js");

describe("Hypixel update feed", () => {
  test("does not poll news when the per-bot news setting is disabled", () => {
    expect(shouldPollHypixelNews({ enabled: true, hypixelNews: false })).toBe(false);
    expect(shouldPollHypixelNews({ enabled: true, hypixelNews: true })).toBe(true);
  });

  test("bounds each request below the polling interval", () => {
    expect(REQUEST_TIMEOUT_MS).toBe(15_000);
    expect(REQUEST_TIMEOUT_MS).toBeLessThan(HYPIXEL_POLL_INTERVAL_MS);
  });

  test("does not poll Hypixel more often than once per minute", () => {
    expect(HYPIXEL_POLL_INTERVAL_MS).toBe(60_000);
  });

  test("remembers old entries without returning them again", () => {
    const now = Date.parse("2026-09-22T18:00:00Z");
    const seenTitles = new Set();
    const items = [
      {
        title: "Recent update",
        pubDate: "Tue, 22 Sep 2026 17:51:42 +0000",
      },
      {
        title: "Old update",
        pubDate: "Sun, 20 Sep 2026 10:57:40 +0000",
      },
    ];

    expect(collectRecentUnseenItems(items, seenTitles, now)).toEqual([items[0]]);
    expect(seenTitles).toEqual(new Set(["Recent update", "Old update"]));
    expect(collectRecentUnseenItems(items, seenTitles, now)).toEqual([]);
  });
});
