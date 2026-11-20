const axios = require("axios");

const uuidCache = new Map();
const usernameCache = new Map();

// Try the mowojang proxy first; on anything but a definitive "not found", fall back to Mojang.
// Resolves to {id, name} or null when the player definitively does not exist.
async function fetchProfile(query, fallbackUrl) {
  try {
    const { data } = await axios.get(`https://mowojang.matdoes.dev/${query}`, { timeout: 5000 });
    if (data && !data.errorMessage && data.id !== undefined) return data;
  } catch (error) {
    if (error.response?.data === "Not found") return null;
  }
  try {
    const { data } = await axios.get(fallbackUrl, { timeout: 10000 });
    return data?.id ? data : null;
  } catch (error) {
    if ([204, 404].includes(error.response?.status)) return null;
    throw error;
  }
}

async function getUUID(username) {
  try {
    if (uuidCache.has(username)) {
      const data = uuidCache.get(username);

      if (data.last_save + 43200000 > Date.now()) {
        return data.id;
      }
    }

    const data = await fetchProfile(username, `https://api.mojang.com/users/profiles/minecraft/${username}`);
    // eslint-disable-next-line no-throw-literal
    if (!data) throw "Invalid username.";

    uuidCache.set(username, {
      last_save: Date.now(),
      id: data.id,
    });

    return data.id;
  } catch (error) {
    if (error !== "Invalid username.") console.log(error);
    throw error;
  }
}

async function getUsername(uuid) {
  try {
    if (usernameCache.has(uuid)) {
      const data = usernameCache.get(uuid);

      if (data.last_save + 43200000 > Date.now()) {
        return data.username;
      }
    }

    const data = await fetchProfile(uuid, `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    // eslint-disable-next-line no-throw-literal
    if (!data || data.name === undefined) throw "Invalid UUID.";

    const cache = {
      last_save: Date.now(),
      username: data.name,
    };

    usernameCache.set(uuid, cache);

    return data.name;
  } catch (error) {
    if (error !== "Invalid UUID.") console.log(error);
    throw error;
  }
}

async function resolveUsernameOrUUID(username) {
  try {
    const { data } = await axios.get(`https://mowojang.matdoes.dev/${username}`);

    return {
      username: data.name,
      uuid: data.id,
    };
  } catch (error) {
    // eslint-disable-next-line no-throw-literal
    if (error.response?.data === "Not found") throw "Invalid Username Or UUID.";
    console.log(error);
    throw error;
  }
}

module.exports = { getUUID, getUsername, resolveUsernameOrUUID };
