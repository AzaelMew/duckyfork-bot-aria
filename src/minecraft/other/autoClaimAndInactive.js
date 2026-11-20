const minecraftCommand = require("../../contracts/minecraftCommand.js");
const config = require("../../../config.json");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const axios = require("axios");
const eventBOT = new minecraftCommand(bot);
const schedule = require('node-schedule');
const fs = require("fs");
let ini = []
let kickables = []

// Inactive
function toMilli(days){
  return days * 86400000;
};
async function getInactiveFromUUID(uuid) {
  try {
    // Fetch guild data and handle errors
    const { data } = await axios.get(`https://api.hypixel.net/v2/guild?key=${config.minecraft.API.hypixelAPIkey}&player=${uuid}`);

    if (!data.guild) {
      console.log("Guild data not found.");
      return;
    }

    if (data.guild.name_lower !== "tempestaria") {
      console.log("This player is not in our guild.");
      return;
    }

    const members = data.guild.members;

    if (!Array.isArray(members)) {
      console.log("Guild members data is not an array.");
      return;
    }

    console.log("Number of guild members:", members.length);

    kickables = [];

    for (let i = 0; i < members.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      try {
        await getActivity(members[i].uuid, members[i].rank);
      } catch (error) {
        console.log("Error in getActivity:", error);
      }
    }
  } catch (error) {
    console.error("Error fetching guild data:", error);
  }
};
async function getActivity(uuid, rank) {
  try {
    const { data } = await axios.get(`https://api.hypixel.net/v2/player?uuid=${uuid}&key=${config.minecraft.API.hypixelAPIkey}`);
    let lastLogin = data.player.lastLogin;

    if (data.player.displayname === "Rioiyo" || data.player.displayname === "YesPleases" || data.player.displayname === "zabbir" || data.player.displayname === "Frindlo" || data.player.displayname === "Nico_the_Creator" || data.player.displayname === "WhenCarrot" || data.player.displayname === "Legendaryspirits" || data.player.displayname === "MistyTM" || data.player.displayname === "Meir231" || data.player.displayname === "Azael_Nya" || data.player.displayname === "Vallekoen") {
      console.log(`${data.player.displayname} is excluded from being kicked.`);
      return;
    }

    if (rank === "Elder" || rank === "Guild Master") {
      console.log(`${data.player.displayname} has a privileged rank and will not be kicked.`);
      return;
    }

    if (new Date().getTime() - lastLogin > toMilli(25)) {
      kickables.push(data.player.displayname);
      console.log(`${data.player.displayname} will be kicked due to inactivity.`);
      console.log("Kickables:", kickables);
    } else {
      console.log(`${data.player.displayname} will not be kicked.`);
    }

    return kickables;
  } catch (error) {
    console.error("Error fetching player data:", error);
    return [];
  }
};
async function getInactiveFromUsername(username) {
  return await getInactiveFromUUID(await getUUIDFromUsername(username))
};
// Autoclaim
function readOrUpdateNumber(jsonFilePath, role) {
  // Read the JSON file
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

  role = role.toLowerCase()
  // Return the number from the JSON data based on the role
  if (role === 'legend') {
      return jsonData.legend;
  } else if (role === 'champion') {
      return jsonData.champion;
  } else if (role === 'knight') {
      return jsonData.knight;
  } else if (role === 'recruit') {
      return jsonData.recruit;
  } else {
      throw new Error('Invalid role. Use "Legend", "Champion", "Knight", or "Recruit".');
  }
}
async function getUUIDFromUsername(username) {
    if (!(/^[a-zA-Z0-9_]{2,16}$/mg.test(username))) {
        return "Error"
    }
    else {
        try {
            const { data } = await axios.get('https://api.mojang.com/users/profiles/minecraft/' + username)
            let uuid = data.id
            let user = username
            return uuid
        } catch {
            const { data } = await axios.get('https://api.ashcon.app/mojang/v2/user/' + username)
            let uuid = data.uuid.replace("-","");
            let user = username
            return uuid
        }

    }
}
async function getUsernameFromUUID(uuid) {
  const { data } = await axios.get('https://sessionserver.mojang.com/session/minecraft/profile/' + uuid)
  let username = data.name
  return username
}
async function getRolesFromUUID(uuid) {
  try {
    if (uuid == undefined) {
      uuid = "a"
    }
    const { data } = await axios.get(`https://api.hypixel.net/v2/guild?key=${config.minecraft.API.hypixelAPIkey}&player=` + uuid)
    try {
      if (data.guild.name_lower != "tempestaria") {
        let ret = "This player is not in our guild."
        return ret
      }
    }
    catch {
      let ret = "Please confirm the name of the player you're trying to look up."
      return ret
    }
    if (data.guild.name_lower != "tempestaria") {
      let ret = "This player is not in our guild."
      return ret
    }
    else {
      let targetUUID
      targetUUID = uuid
      let name
      ini = []
      adv = []
      vet = []
      champ = []
      for (i = 0; i < data.guild.members.length + 1; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
        if (i <= data.guild.members.length - 1) {
          let joined = data?.guild.members[i]?.joined
          joined = new Date(joined).toLocaleString()
          let newData = data.guild.members[i];
          let expValue = Object.values(newData.expHistory)
  
          let total = expValue[0] + expValue[1] + expValue[2] + expValue[3] + expValue[4] + expValue[5] + expValue[6]
          let xp = total
          try {
            getRank(data.guild.members[i].uuid, data.guild.members[i].rank, xp)
          }
          catch {
            console.log("Well something fucked up..")
          }
        }
        else if (i == data.guild.members.length) {
          for (s = 0; s < 100; s++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            if(s==100){
              return
            }
          }
        }
      }
    }
  }
  catch (error) {
    e = error.message
    if (e.includes("status code 500")) {
      return "Error has occured"
    }
    if (e.includes("status code 404")) {
      return "Error has occured"
    }
    else {
      return error
    }
  }
}
async function getRank(uuid, rank, xp) {
  let legend = readOrUpdateNumber('/tempest/level.json' ,"legend");
  let champion = readOrUpdateNumber('/tempest/level.json' ,"champion");
  let knight = readOrUpdateNumber('/tempest/level.json' ,"knight");
  
  legend = legend * 100
  champion = champion * 100
  knight = knight * 100

  const { data } = await axios.get(`https://api.hypixel.net/v2/skyblock/profiles?key=${config.minecraft.API.hypixelAPIkey}&uuid=${uuid}`)
  let name = await getUsernameFromUUID(uuid)
  let newlvl = 0
  for (b = 0; b < Object.keys(data.profiles).length; b++) {
    if(newlvl < data.profiles[b]?.members[uuid]?.leveling?.experience){
      newlvl = data.profiles[b]?.members[uuid]?.leveling?.experience
    }
  }

  if(rank=="Elder") return;
  if(rank=="Guild Master") return;
  if (newlvl >= legend) {
    if(rank=="Legend") return
    ini.push(`${name} Legend`)
    return
  };
  if (newlvl >= champion) {
    if(rank=="Champion") return
    ini.push(`${name} Champion`)
    return
  }
  else if (newlvl >= knight) {
    if(rank=="Knight") return
    ini.push(`${name} Knight`)

    return
  }
  else {
    if(rank=="Recruit") return
    ini.push(`${name} Recruit`)

    return
  }
}
async function getRolesFromUsername(username) {
  return await getRolesFromUUID(await getUUIDFromUsername(username))
}


// Specify the time when you want the code to run
const InactiveTime = '30 18 * * *'; // Example: Run at 14:30 (2:30 PM)
const ClaimTime = '0 18 * * *'; // Example: Run at 14:30 (2:30 PM)

// Schedule the task
schedule.scheduleJob(ClaimTime, () => {
  getRolesFromUsername("ashirlen").then(a => {
    let cat = 0
    let cat2 = 0
    let cat3 = 0
    let interval = 750; // how much time should the delay between two iterations be (in milliseconds)?
    for (let index = 0; index < ini.length; ++index) {
      let el = ini[index]
      setTimeout(() => {
        eventBOT.warpSend(`/g setrank ${el}`)
      }, index * interval);
    }
  })
});

schedule.scheduleJob(InactiveTime, () => {
  return
  kickables = []
  getInactiveFromUsername("ashirlen").then(kickabes => {
    let interval = 750; // how much time should the delay between two iterations be (in milliseconds)?
    for (let index = 0; index < (kickables).length; ++index) {
      let el = kickables[index]
      setTimeout(() => {
        eventBOT.warpSend(`/g kick ${el} Kicked due to inactivity, you're free to re apply once you're active.`)
      }, index * interval);
    };
  })
});