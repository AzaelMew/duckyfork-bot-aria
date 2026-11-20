const minecraftCommand = require("../../contracts/minecraftCommand.js");
const config = require("../../../config.json");

class GHCommand extends minecraftCommand {
    constructor(minecraft) {
        super(minecraft)

        this.name = 'farmhelper'
        this.aliases = ["fh"]
        this.description = 'Gives needed farm info'
    }

    onCommand(username, message) {
        let args = message.toLowerCase().split(" ")
        this.send("/gc Compatible farms at /visit farminghub l$H117|jjnhvsdpn/tOTLITR")
    }
}

module.exports = GHCommand
