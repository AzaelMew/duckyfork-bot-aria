const config = require("../../../config.json");
const path = require("node:path");
const Rss = require("rss-parser");
const axios = require("axios");
const { loadNotifierState, saveNotifierState } = require("./notifierState.js");
const {
  collectRecentUnseenItems,
  HYPIXEL_POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  shouldPollHypixelNews,
} = require("./hypixelUpdateFeed.js");
const parser = new Rss({ timeout: REQUEST_TIMEOUT_MS });
const notifierStatePath = path.resolve(__dirname, "../../../data/hypixel-notifier.json");
const notifierState = loadNotifierState(notifierStatePath);
const hypixelIncidents = notifierState.incidents;
const hypixelUpdates = new Set(notifierState.newsTitles);

function persistNotifierState() {
  notifierState.newsTitles = [...hypixelUpdates].slice(-500);
  notifierState.incidents = hypixelIncidents;
  saveNotifierState(notifierStatePath, notifierState);
}

const hypixelUpdatesConfig = config.minecraft.hypixelUpdates;
if (hypixelUpdatesConfig.enabled === true) {
  if (shouldPollHypixelNews(hypixelUpdatesConfig)) {
    setInterval(checkForHypixelUpdates, HYPIXEL_POLL_INTERVAL_MS);
    checkForHypixelUpdates(true);
  }

  if (hypixelUpdatesConfig.statusUpdates === true) {
    setInterval(checkForIncidents, HYPIXEL_POLL_INTERVAL_MS);
  }

  if (hypixelUpdatesConfig.skyblockVersion === true) {
    setInterval(checkForSkyblockVersion, HYPIXEL_POLL_INTERVAL_MS);
  }
}

async function checkForIncidents() {
  try {
    const { items: status } = await parser.parseURL("https://status.hypixel.net/history.rss");

    const latestIcidents = status.filter((data) => new Date(data.pubDate).getTime() / 1000 + 43200 > Date.now() / 1000);

    for (const incident of latestIcidents) {
      const { title, link } = incident;

      if (hypixelIncidents[title]?.notified !== true) {
        hypixelIncidents[title] = { notified: true };
        persistNotifierState();
        bot.chat(`/gc [HYPIXEL STATUS] ${title} | ${link}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const updates = JSON.stringify(incident.contentSnippet)
        .split("\\n")
        .filter((_, index) => index % 2 !== 0);

      for (const update of updates) {
        if (hypixelIncidents[title]?.updates?.includes(update) === true) continue;

        hypixelIncidents[title].updates ??= [];
        if (bot !== undefined && bot._client.chat !== undefined) {
          hypixelIncidents[title].updates.push(update);
          persistNotifierState();
          bot.chat(`/gc [HYPIXEL STATUS UPDATE] ${title} | ${update}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

async function checkForHypixelUpdates(firstTime = false) {
  try {
    const [{ items: news }, { items: skyblockNews }] = await Promise.all([
      parser.parseURL("https://hypixel.net/forums/news-and-announcements.4/index.rss"),
      parser.parseURL("https://hypixel.net/forums/skyblock-patch-notes.158/index.rss"),
    ]);

    const previousUpdateCount = hypixelUpdates.size;
    const recentUpdates = collectRecentUnseenItems(news.concat(skyblockNews), hypixelUpdates);
    if (hypixelUpdates.size !== previousUpdateCount) {
      persistNotifierState();
    }
    if (firstTime === true) {
      return;
    }

    for (const { title, link } of recentUpdates) {
      if (bot !== undefined && bot._client.chat !== undefined) {
        bot.chat(`/gc [HYPIXEL UPDATE] ${title} | ${link}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  } catch (error) {
    console.log(error);
  }
}

let skyblockVersion;
async function checkForSkyblockVersion() {
  try {
    const { data } = await axios.get("https://api.hypixel.net/v2/resources/skyblock/skills", {
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (skyblockVersion !== data.version) {
      if (skyblockVersion !== undefined) {
        bot.chat(
          `/gc [HYPIXEL SKYBLOCK] Skyblock version has been updated to ${data.version}! Server restarts might occur!`,
        );
      }

      skyblockVersion = data.version;
    }
  } catch (error) {
    console.log(error);
  }
}
