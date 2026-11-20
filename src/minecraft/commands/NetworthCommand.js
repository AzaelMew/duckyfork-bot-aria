const { getLatestProfile } = require("../../../API/functions/getLatestProfile.js");
const { getMuseum } = require("../../../API/functions/getMuseum.js");
const { getUsername } = require("../../contracts/API/mowojangAPI.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const {
  formatNumber,
  capitalize
} = require("../../contracts/helperFunctions.js");
const { ProfileNetworthCalculator } = require("skyhelper-networth");

const categoryNames = {
  armor: "Armor",
  equipment: "Equipment",
  wardrobe: "Wardrobe",
  inventory: "Inventory",
  enderchest: "Ender Chest",
  accessories: "Accessories",
  personal_vault: "Personal Vault",
  fishing_bag: "Fishing Bag",
  potion_bag: "Potion Bag",
  sacks_bag: "Sacks Bag",
  candy_inventory: "Candy Inventory",
  carnival_mask_inventory: "Carnival Masks",
  storage: "Storage",
  museum: "Museum",
  sacks: "Sacks",
  essence: "Essence",
  pets: "Pets",
  quiver: "Quiver",
  farming_toolkit: "Farming Toolkit",
  hunting_toolkit: "Hunting Toolkit"
};

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (value) => formatNumber(asNumber(value));

class NetworthCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft);
    this.name = "networth";
    this.aliases = ["nw"];
    this.description = "SkyBlock networth and category breakdown.";
    this.options = [{ name: "username", description: "Minecraft username", required: false }];
  }

  async onCommand(player, message) {
    try {
      const target = this.getArgs(message)[0] || player;
      const validName = /^[a-zA-Z0-9_]{2,16}$/;
      const validUUID = /^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12})$/;

      if (!validName.test(target) && !validUUID.test(target)) {
        return this.send("/gc Invalid Minecraft username.");
      }

      const data = await getLatestProfile(target);
      const { profile, profileData, uuid } = data;
      let museum = data.museum;
      if (museum === undefined) {
        try {
          museum = (await getMuseum(profileData.profile_id, uuid)).museum;
        } catch (error) {
          console.warn("[NETWORTH MUSEUM]", error);
          museum = null;
        }
      }

      const username = validUUID.test(target)
        ? await getUsername(uuid).catch(() => target)
        : target;
      const calculator = new ProfileNetworthCalculator(
        profile,
        museum,
        profileData.banking?.balance ?? 0
      );
      const nw = await calculator.getNetworth({ onlyNetworth: true });
      if (nw.noInventory) {
        return this.send("/gc " + username + " has Inventory API disabled!");
      }

      const total = asNumber(nw.networth);
      if (total <= 0) {
        return this.send("/gc " + username + "'s networth is 0.");
      }

      const purse = asNumber(nw.purse);
      const bank = asNumber(nw.bank ?? profileData.banking?.balance);
      const personalBank = asNumber(nw.personalBank);

      const excludedTypes = new Set(["coins", "purse", "bank", "personalbank", "personal_bank"]);
      const categories = Object.entries(nw.types ?? {})
        .filter(([type]) => !excludedTypes.has(type.toLowerCase()))
        .map(([type, value]) => ({
          name: categoryNames[type] ?? capitalize(type),
          total: asNumber(value?.total)
        }));

      const coins = purse + bank + personalBank;
      if (coins > 0) categories.push({ name: "Coins", total: coins });

      const sorted = categories.filter(({ total: value }) => value > 0)
        .sort((a, b) => b.total - a.total);
      const major = [];
      let otherTotal = 0;
      for (const category of sorted) {
        if (category.total / total >= 0.01) major.push(category);
        else otherTotal += category.total;
      }
      if (otherTotal > 0) major.push({ name: "Other", total: otherTotal });

      const percent = (value) => (100 * value / total).toFixed(1) + "%";
      const parts = major.map((category) =>
        category.name + ": " + fmt(category.total) + " (" + percent(category.total) + ")"
      );

      // One bounded guild-chat message. Full details stay in the Discord embed.
      const limit = 220;
      let summary = username + "'s NW: " + fmt(total) +
        " | Purse: " + fmt(purse) + " | Bank: " + fmt(bank) + "+" + fmt(personalBank);
      let shown = 0;
      for (const part of parts) {
        const addition = (shown === 0 ? " » " : " | ") + part;
        if (summary.length + addition.length > limit - 18) break;
        summary += addition;
        shown++;
      }
      if (shown < parts.length && summary.length + 18 <= limit) {
        summary += " | More on Discord";
      }
      this.send("/gc " + summary.slice(0, limit));

      const details = [
        "**Total:** " + fmt(total),
        "**Purse:** " + fmt(purse),
        "**Bank:** " + fmt(bank),
        "**Personal Bank:** " + fmt(personalBank),
        "",
        "**Networth breakdown**",
        ...major.map((category) =>
          "**" + category.name + ":** " + fmt(category.total) + " (" + percent(category.total) + ")"
        )
      ].join("\n");

      if (typeof this.minecraft.broadcastCommandEmbed === "function") {
        try {
          await this.minecraft.broadcastCommandEmbed({
            username: username + "'s networth",
            message: details.slice(0, 3900)
          });
        } catch (error) {
          console.error("[NETWORTH DISCORD ERROR]", error);
        }
      }
    } catch (error) {
      console.error("[NETWORTH ERROR]", error);
      // Avoid exposing raw API errors or sending oversized chat messages.
      this.send("/gc [ERROR] Could not calculate networth. Please try again later.");
    }
  }
}

module.exports = NetworthCommand;
