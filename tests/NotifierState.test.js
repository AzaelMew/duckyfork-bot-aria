/* eslint-env jest */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadNotifierState, saveNotifierState } = require("../src/minecraft/other/notifierState.js");

describe("notifier state", () => {
  test("persists seen news and incidents across reloads", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "duckyfork-notifier-"));
    const statePath = path.join(directory, "hypixel-notifier.json");
    const state = {
      newsTitles: ["Already announced"],
      incidents: {
        Maintenance: { notified: true, updates: ["Investigating"] },
      },
    };

    saveNotifierState(statePath, state);

    expect(loadNotifierState(statePath)).toEqual(state);
    expect(fs.existsSync(`${statePath}.tmp`)).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
