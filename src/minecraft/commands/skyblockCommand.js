const { formatNumber, formatUsername } = require("../../contracts/helperFunctions.js");
const { getLatestProfile } = require("../../../API/functions/getLatestProfile.js");
const minecraftCommand = require("../../contracts/minecraftCommand.js");
const config = require("../../../config.json");
const getTalismans = require("../../../API/stats/talismans.js");
const getDungeons = require("../../../API/stats/dungeons.js");
const getSkills = require("../../../API/stats/skills.js");
const getSlayer = require("../../../API/stats/slayer.js");
const getHotm = require("../../../API/stats/hotm.js");
const { ProfileNetworthCalculator } = require("skyhelper-networth");
const { getMuseum } = require("../../../API/functions/getMuseum.js");

class SkyblockCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft);

    this.name = "skyblock";
    this.aliases = ["stats", "sb"];
    this.description = "Skyblock Stats of specified user.";
    this.options = [
      {
        name: "username",
        description: "Minecraft username",
        required: false,
      },
    ];
  }

  async onCommand(username, message) {
    try {
      username = this.getArgs(message)[0] || username;

      const data = await getLatestProfile(username);
      username = formatUsername(username, data.profileData.game_mode);

      // getLatestProfile may return cached data without museum information.
      let museum = data.museum;
      if (museum === undefined) {
        try {
          museum = (await getMuseum(data.profileData.profile_id, data.uuid)).museum;
        } catch (error) {
          console.warn("[SKYBLOCK MUSEUM]", error);
          museum = null;
        }
      }
      const networthManager = new ProfileNetworthCalculator(
        data.profile,
        museum,
        data.profileData?.banking?.balance ?? 0,
      );

      const [skills, slayer, networth, dungeons, talismans, hotm] = await Promise.all([
        getSkills(data.profile),
        getSlayer(data.profile),
        networthManager.getNetworth({ onlyNetworth: true }),
        getDungeons(data.profile),
        getTalismans(data.profile),
        getHotm(data.player, data.profile),
      ]);

      const skillAverage = (
        Object.keys(skills)
          .filter((skill) => !["runecrafting", "social"].includes(skill))
          .map((skill) => skills[skill].level)
          .reduce((a, b) => a + b, 0) /
        (Object.keys(skills).length - 2)
      ).toFixed(1);

      const slayerText = Object.keys(slayer)
        .reduce(
          (acc, slayerType) => `${acc} | ${slayerType.substring(0, 1).toUpperCase()}:${slayer[slayerType].level}`,
          "",
        )
        .slice(3);
      const catacombsLevel = dungeons.catacombs.skill.level;
      const classAverage =
        Object.values(dungeons.classes)
          .map((value) => value.level)
          .reduce((a, b) => a + b, 0) / Object.keys(dungeons.classes).length;
      const networthValue = formatNumber(networth.networth);
      const hotmLevel = hotm?.level?.level ?? 0;
      const mp = formatNumber(talismans?.magicPower ?? 0);

      this.send(
        `/gc ${username}'s Level: ${
          data.profile.leveling?.experience ? data.profile.leveling.experience / 100 : 0
        } | Skill Avg: ${skillAverage} | Slayer: ${slayerText} | Cata: ${catacombsLevel} | Class Avg: ${classAverage} | NW: ${networthValue} | MP: ${mp} | Hotm: ${hotmLevel}`,
      );
    } catch (error) {
      this.send(`/gc [ERROR] ${error}`);
    }
  }
}

module.exports = SkyblockCommand;
