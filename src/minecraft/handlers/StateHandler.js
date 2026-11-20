const eventHandler = require("../../contracts/EventHandler.js");
const Logger = require("../../Logger.js");

class StateHandler extends eventHandler {
  constructor(minecraft) {
    super();

    this.minecraft = minecraft;
    this.loginAttempts = 0;
    this.exactDelay = 0;
    this.loggedIn = false;
    this.reconnectScheduled = false;
  }

  registerEvents(bot) {
    this.bot = bot;
    this.loggedIn = false;

    this.bot.on("login", (...args) => this.onLogin(...args));
    this.bot.on("end", (...args) => this.onEnd(...args));
    this.bot.on("kicked", (...args) => this.onKicked(...args));
    this.bot.on("error", (...args) => this.onError(...args));
  }

  onLogin() {
    Logger.minecraftMessage("Client ready, logged in as " + this.bot.username);

    this.loggedIn = true;
    this.loginAttempts = 0;
    this.exactDelay = 0;
    this.reconnectScheduled = false;
  }

  onEnd(reason) {
    if (reason && reason === "restart") {
      return;
    }

    this.scheduleReconnect();
  }

  onError() {
    // Connection/auth failures before login (e.g. network outage) emit "error" without "end"
    if (!this.loggedIn) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectScheduled) {
      return;
    }
    this.reconnectScheduled = true;
    this.loginAttempts++;

    const loginDelay = Math.min(this.exactDelay > 60000 ? 60000 : this.loginAttempts * 50000, 60000);
    Logger.warnMessage(`Minecraft bot has disconnected! Attempting reconnect in ${loginDelay / 1000} seconds`);

    setTimeout(() => {
      this.reconnectScheduled = false;

      try {
        this.minecraft.connect();
      } catch (error) {
        Logger.warnMessage(`Minecraft reconnect attempt failed: ${error}`);
        this.scheduleReconnect();
      }
    }, loginDelay);
  }

  onKicked(reason) {
    Logger.warnMessage(`Minecraft bot has been kicked from the server for "${reason}"`);

    this.loginAttempts++;
  }
}

module.exports = StateHandler;
