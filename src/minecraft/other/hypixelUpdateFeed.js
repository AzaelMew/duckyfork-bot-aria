const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const HYPIXEL_POLL_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

function shouldPollHypixelNews(settings) {
  return settings?.enabled === true && settings?.hypixelNews === true;
}

function collectRecentUnseenItems(items, seenTitles, now = Date.now(), maxAgeMs = TWELVE_HOURS_MS) {
  const recentItems = [];

  for (const item of items) {
    if (seenTitles.has(item.title)) {
      continue;
    }

    seenTitles.add(item.title);
    const publishedAt = Date.parse(item.isoDate ?? item.pubDate);
    if (Number.isNaN(publishedAt) || publishedAt + maxAgeMs < now) {
      continue;
    }

    recentItems.push(item);
  }

  return recentItems;
}

module.exports = {
  collectRecentUnseenItems,
  HYPIXEL_POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  shouldPollHypixelNews,
};
