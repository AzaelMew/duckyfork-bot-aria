const fs = require("node:fs");
const path = require("node:path");

function normalizeNotifierState(state) {
  return {
    newsTitles: Array.isArray(state?.newsTitles) ? state.newsTitles.filter((title) => typeof title === "string") : [],
    incidents: state?.incidents && typeof state.incidents === "object" && !Array.isArray(state.incidents) ? state.incidents : {},
  };
}

function loadNotifierState(statePath) {
  try {
    return normalizeNotifierState(JSON.parse(fs.readFileSync(statePath, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not load notifier state from ${statePath}: ${error.message}`);
    }
    return normalizeNotifierState();
  }
}

function saveNotifierState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(normalizeNotifierState(state), null, 2)}\n`);
  fs.renameSync(temporaryPath, statePath);
}

module.exports = { loadNotifierState, saveNotifierState };
