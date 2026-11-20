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

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const fmt = (value) => formatNumber(safeNumber(value));

const getErrorMessage = (error) => {
  const message =
    typeof error === "string"
      ? error
      : error?.response?.data?.cause ??
        error?.message ??
        "Unable to calculate networth.";

  return String(message).replace(/[\r\n]+/g, " ");
};

class NetworthCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft);

    this.name = "networth";
    this.aliases = ["nw"];
    this.description = "Detailed SkyBlock networth breakdown.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
        required: false
      }
    ];
  }

  // Split guild chat messages at category boundaries.
  async sendBreakdown(header, parts, username) {
    const maxLength = 225;
    const continuation = `${username} NW » `;

    let line = header;
    let first = true;

    for (const part of parts) {
      const separator = first ? " » " : " | ";
      const addition = separator + part;

      if (line.length + addition.length > maxLength) {
        this.send(`/gc ${line}`);
        await sleep(1250);

        line = continuation + part;
      } else {
        line += addition;
      }

      first = false;
    }

    this.send(`/gc ${line}`);
  }

  async onCommand(player, message) {
    try {
      const args = this.getArgs(message);
      const target = args[0] || player;

      const validName = /^[a-zA-Z0-9_]{2,16}$/;
      const validUUID = /^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12})$/;

      if (!validName.test(target) && !validUUID.test(target)) {
        return this.send("/gc Invalid Minecraft username.");
      }

      // Retrieve player profile
      const result = await getLatestProfile(target, {
        museum: true
      });

      const { profile, profileData, uuid } = result;
      let museum = result.museum;

      // The repository's profile cache can return a result
      // without museum data from an earlier cached request.
      if (museum === undefined) {
        const museumResult = await getMuseum(
          profileData.profile_id,
          uuid
        );

        museum = museumResult.museum;
      }

      const username = validUUID.test(target)
        ? await getUsername(uuid).catch(() => target)
        : target;

      const bankingBalance =
        safeNumber(profileData.banking?.balance);

      // New SkyHelper networth calculator
      const calculator = new ProfileNetworthCalculator(
        profile,
        museum,
        bankingBalance
      );

      const nw = await calculator.getNetworth({
        onlyNetworth: true
      });

      if (nw.noInventory === true) {
        return this.send(
          `/gc ${username} has Inventory API disabled!`
        );
      }

      const total = safeNumber(nw.networth);

      if (total <= 0) {
        return this.send(
          `/gc ${username}'s networth is 0.`
        );
      }

      // Currency
      const purse = safeNumber(nw.purse);
      const bank = safeNumber(nw.bank ?? bankingBalance);
      const personalBank = safeNumber(nw.personalBank);

      // Exclude coin categories to avoid counting them twice
      const excludedTypes = new Set([
        "coins",
        "purse",
        "bank",
        "personalbank",
        "personal_bank"
      ]);

      // Dynamically include all SkyHelper categories
      const categories = Object.entries(nw.types ?? {})
        .filter(([type]) => !excludedTypes.has(type.toLowerCase()))
        .map(([type, data]) => ({
          name: categoryNames[type] ?? capitalize(type),
          total: safeNumber(data?.total)
        }));

      const coins = purse + bank + personalBank;

      if (coins > 0) {
        categories.push({
          name: "Coins",
          total: coins
        });
      }

      // Sort highest to lowest
      const sorted = categories
        .filter(category => category.total > 0)
        .sort((a, b) => b.total - a.total);

      // Combine categories worth less than 1% into Other
      const major = [];
      let otherTotal = 0;

      for (const category of sorted) {
        if (category.total / total >= 0.01) {
          major.push(category);
        } else {
          otherTotal += category.total;
        }
      }

      if (otherTotal > 0) {
        major.push({
          name: "Other",
          total: otherTotal
        });
      }

      const percentage = value =>
        ((value / total) * 100).toFixed(1);

      // Minecraft guild chat
      const header =
        `${username}'s NW: ${fmt(total)}` +
        ` | Purse: ${fmt(purse)}` +
        ` | Bank: ${fmt(bank)} + ${fmt(personalBank)}`;

      const parts = major.map(category =>
        `${category.name}: ${fmt(category.total)} ` +
        `(${percentage(category.total)}%)`
      );

      await this.sendBreakdown(header, parts, username);

      // Discord embed with full breakdown
      const discordMessage = [
        `**Total Networth:** ${fmt(total)}`,
        `**Purse:** ${fmt(purse)}`,
        `**Bank:** ${fmt(bank)}`,
        `**Personal Bank:** ${fmt(personalBank)}`,
        "",
        "**Networth Breakdown**",
        ...major.map(category =>
          `**${category.name}:** ${fmt(category.total)} ` +
          `(${percentage(category.total)}%)`
        )
      ].join("\n");

      if (
        typeof this.minecraft.broadcastCommandEmbed ===
        "function"
      ) {
        try {
          await this.minecraft.broadcastCommandEmbed({
            username: `${username}'s Networth`,
            message: discordMessage
          });
        } catch (discordError) {
          console.error(
            "[NETWORTH DISCORD ERROR]",
            discordError
          );
        }
      }

    } catch (error) {
      console.error("[NETWORTH ERROR]", error);
      this.send(`/gc [ERROR] ${getErrorMessage(error)}`);
    }
  }
}

module.exports = NetworthCommand;
