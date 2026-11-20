const minecraftCommand = require("../../contracts/minecraftCommand.js");
const config = require("../../../config.json");
const axios = require("axios");
const fs = require('fs');

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
async function getLocationFromUUID(uuid) {
    let location = "Holy shit you broke me!! Dm Azael!"
    if (uuid == "f03695547707486ab2308518f04102f7") return
    try {
        const { data } = await axios.get(`https://api.hypixel.net/v2/status?key=${config.minecraft.API.hypixelAPIkey}&uuid=` + uuid)

        if (data.session.online === true) {
            switch (data.session.gameType) {
                case "SKYBLOCK":
                    switch (data.session.mode) {
                        case "garden": location = "Garden"; break;
                        case "dynamic": location = "Private Island"; break;
                        case "hub": location = "Skyblock Hub"; break;
                        case "rift": location = "The Rift"; break;
                        case "mining_1": location = "Gold Mines"; break;
                        case "mining_2": location = "Deep Caverns"; break;
                        case "mining_3": location = "Dwarven Mines"; break;
                        case "foraging_1": location = "The Park"; break;
                        case "foraging_2": location = "Galatea"; break;
                        case "combat_1": location = "Spider's Den"; break;
                        case "crimson_isle": location = "Crimson Isle"; break;
                        case "combat_3": location = "The End"; break;
                        case "farming_1": location = "The Barn"; break;
                        case "crystal_hollows": location = "Crystal Hollows"; break;
                        case "winter": location = "Jerry's Workshop"; break;
                        case "dungeon": location = "Dungeons"; break;
                        case "dungeon_hub": location = "Dungeon Hub"; break;
                        case "fishing_1": location = "Backwater Bayou"; break;
                        default: location = "Unknown Skyblock Location"; break;
                    }
                    break;

                case "PROTOTYPE":
                    location = "Prototype Lobby";
                    break;

                case "MAIN":
                    location = "Main Lobby";
                    break;

                case "BEDWARS":
                    switch (data.session.mode) {
                        case "LOBBY": location = "Bedwars Lobby"; break;
                        case "BEDWARS_EIGHT_ONE": location = "Solo Bedwars"; break;
                        case "BEDWARS_EIGHT_TWO": location = "Duo Bedwars"; break;
                        case "BEDWARS_FOUR_THREE": location = "3's Bedwars"; break;
                        case "BEDWARS_FOUR_FOUR": location = "4's Bedwars"; break;
                        case "BEDWARS_TWO_FOUR": location = "4v4 Bedwars"; break;
                        default: location = "Unknown Bedwars Mode"; break;
                    }
                    break;

                case "SKYWARS":
                    switch (data.session.mode) {
                        case "LOBBY": location = "Skywars Lobby"; break;
                        case "solo_normal": location = "Skywars Solo Normal"; break;
                        case "teams_normal": location = "Skywars Teams Normal"; break;
                        case "solo_insane": location = "Skywars Solo Insane"; break;
                        case "teams_insane": location = "Skywars Teams Insane"; break;
                        default: location = "Unknown Skywars Mode"; break;
                    }
                    break;

                case "MURDER_MYSTERY":
                    location = "Murder Mystery Lobby";
                    break;

                case "HOUSING":
                    location = data.session.mode === "base" ? "Someone's Housing" : "Housing Lobby";
                    break;

                case "ARCADE":
                    location = "Arcade Lobby";
                    break;

                case "BUILD_BATTLE":
                    location = "Build Battle Lobby";
                    break;

                case "DUELS":
                    location = data.session.mode === "LOBBY" ? "Duels Lobby" : "Duels Game";
                    break;

                case "TNTGAMES":
                    switch (data.session.mode) {
                        case "TNTRUN": location = "TNT Run"; break;
                        case "TNTTAG": location = "TNT Tag"; break;
                        case "LOBBY": location = "TNT Games Lobby"; break;
                        default: location = "Unknown TNT Game Mode"; break;
                    }
                    break;

                case "SMP":
                    location = "Hypixel SMP";
                    break;

                default:
                    location = "Unknown Game Type";
                    break;
            }
        } else {
            location = "Player is Offline";
        }


        return location
    }
    catch {
        location = "Player doesn't exist"
        return location
    }

}

async function getLocationFromUsername(username) {
    return await getLocationFromUUID(await getUUIDFromUsername(username))
}

class StalkCommand extends minecraftCommand {
    constructor(discord) {
        super(discord)
        this.permission = "all"

        this.name = 'stalk'
        this.description = `Checks user's location`
    }

    onCommand(username, message) {

        let args = message.split(" ")
        let newusername = args[1]
        getLocationFromUsername(newusername).then(location => {
            this.send(`/gc ${newusername}'s location: ${location}`)
        })
    }
}

module.exports = StalkCommand
