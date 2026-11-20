const minecraftCommand = require("../../contracts/minecraftCommand.js");
const config = require("../../../config.json");
let rolls
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
  charactersLength));
   }
   return result;
}
async function roll(username, input) {
  // Normalize input
  input = input.toLowerCase().trim();

  // Match patterns like "d20", "2d6", etc.
  const match = input.match(/^(\d*)d(\d+)$/);
  if (!match) {
    return `Invalid roll format, ${username}. Use NdM format like 2d6 or d20.`;
  }

  // Extract dice count and sides, defaulting to 1 if not provided
  let numDice = match[1] === '' ? 1 : parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);

  if (numDice <= 0 || sides <= 0) {
    return `Number of dice and sides must be positive integers, ${username}.`;
  }

  // Enforce maximums
  if (numDice > 100) {
    return `Too many dice, ${username}. The maximum allowed is 100.`;
  }

  if (sides > 100) {
    return `Too many sides per die, ${username}. The maximum allowed is 100.`;
  }

  const rollsArray = [];
  for (let i = 0; i < numDice; i++) {
    rollsArray.push(1 + Math.floor(Math.random() * sides));
  }

  const total = rollsArray.reduce((a, b) => a + b, 0);
  let rollsStr = rollsArray.join(', ');

  // Special handling for natural 20 and natural 1 on single d20
  if (numDice === 1 && sides === 20) {
    if (rollsArray[0] === 20) {
      return `${username} rolled a natural 20! 🎉`;
    } else if (rollsArray[0] === 1) {
      return `Oooh... Bad luck ${username}, it's a natural 1. 😢`;
    }
  }

  return `${username} rolled ${numDice}d${sides}: [${rollsStr}] → Total: ${total}`;
}


class PingCommand extends minecraftCommand {
  constructor(minecraft) {
    super(minecraft)

    this.name = 'roll'
    this.aliases = []
    this.description = 'Replies with a DND roll to the user'
  }

  onCommand(username, message) {
    let args = message.split(" ")

    if (args[1] != undefined){
      roll(username, args[1]).then(rolls => {
        setTimeout(() => {
          this.send(`/gc ${rolls}`)
          this.minecraft.broadcastCleanEmbed({ message: `${rolls}`, color: parseInt("47F049", 16) })
        }, 1000)
      })
    }
    else {
      roll(username, "6").then(rolls => {
        setTimeout(() => {
          this.send(`/gc ${rolls}`)
          this.minecraft.broadcastCleanEmbed({ message: `${rolls}`, color: parseInt("47F049", 16) })
        }, 1000)
      })
    }
  }
}

module.exports = PingCommand
