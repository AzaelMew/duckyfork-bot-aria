const config = require("../../config.json");
const axios = require("axios");

async function apicall(message) {
  try {
    const response = await axios.post('http://192.168.0.5:3001/api/command', { message: message }, { headers: { Authorization: config.web.token } })
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused: Aria is offline');
    } else {
      console.error('An error occurred:', error.message);
    }
  }
}
class DiscordCommand {
  constructor(discord) {
    this.discord = discord;
  }

  getArgs(message) {
    const args = message.content.split(" ");

    args.shift();

    return args;
  }

  sendMinecraftMessage(message) {
    if (this.discord.app.minecraft.bot.player !== undefined) {
      this.discord.app.minecraft.bot.chat(message);
      if(message.includes("/g invite")) return
      apicall(message)
    }
  }
  sendPromoteMessage(message) {
    if (this.discord.app.minecraft.bot.player !== undefined) {
      this.discord.app.minecraft.bot.chat(message);
    }
  }
  onCommand(message) {
    throw new Error("Command onCommand method is not implemented yet!");
  }
}

module.exports = DiscordCommand;
