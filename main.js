const { Fortnite, Platforms } = require('fortnitenode');
const Discord = require('discord.js');
const client = new Discord.Client()
const fs = require('fs')
const request = require('request');
const MIN_PLAYERS = 2;
const PUBLIC_CHANNEL_ID = '617341908884389908';
const ADMIN_CHANNEL_ID = '650615163283570689';
var players = [];
var itemList = '';

const fortnite = new Fortnite({
    debugger: function() {},
    "credentials": {
        "deviceAuth": {
            "device_id": "084f880b73f145d8bf17dbccab9c8e6b",
            "account_id": "86bda6441986410ebeda1543c78335f0",
            "secret": "ZTN3N2ZMXPHV5JIBL5XY3LD5LBLBV5P3"
        }
    },
    "settings": {
      "platform": Platforms.WINDOWS,       
    }
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("Team Rumble", {type: "PLAYING"})
});

let newItems = request('https://benbotfn.tk/api/v1/newCosmetics',{ json: true }, (err, res, body) => {
  newItems = body.items;
  for(item in newItems) {
    if (newItems[item].backendType == "AthenaDance" || newItems[item].backendType == "AthenaCharacter") {
      itemList += "**" + newItems[item].name + ':** ' + newItems[item].id + '\n';
    }
  }
});

(async () => {
    await fortnite.init();
    await fortnite.party.setPlaylist("playlist_respawn_24");
    await fortnite.me.setCharacter("CID_754_Athena_Commando_F_RaveNinja");
    await fortnite.me.setBanner("OtherBanner28", "DefaultColor1", 1000);
    await fortnite.party.sendPartyPresence("Lobby bot for FNTR Official\n 24/7 Lobbies\n Join at discord.gg/fntr");
    await fortnite.me.setReadiness("SittingOut");
    
    // Friend Request
    fortnite.stream.on('friend#request', async request => {
      await request.accept();
    });

    // Party member joined
    fortnite.stream.on('member#join', async (member) => {
      member = await fortnite.launcher.getAccount(member.id);
      console.log(member.id + " (" + member.displayName + ") Has Connected!" );
      players.push(member.id);
      fs.readFile('./blacklist.json', 'utf8', (err, data) => { // Loop to check if a user is banned, if so, kick them
        var wUsers = JSON.parse(data);
        if (wUsers.users.includes(member.id)) {
          fortnite.party.kick(member.id);
        }
      });
      if (players.length >= MIN_PLAYERS) {  // If player count is at least MIN_PLAYERS, start a 1.5 minute countdown before bot auto disconnect
        setTimeout(function() {
          fortnite.party.leave(true);
          players = [];
        }, 5000);
       }
      });

    // Player ready state changes
    /*fortnite.stream.on('member#state', async (member) => {
      console.log("member updated");
      if (member.member.meta.GameReadiness_s == "Ready") {
        await fortnite.me.setReadiness("NotReady");
        await fortnite.me.setReadiness("SittingOut");
      }
    });*/

    // Party member left
    fortnite.stream.on('member#leave', async (member) => {
      await fortnite.party.sendPartyPresence("Lobby bot for FNTR Official\n 24/7 Lobbies\n Join at discord.gg/fntr");
      var connections = member.connections.id;
      var id = connections.slice(0, 32);
      if (players.includes(id)) {
        players.splice(id, 1);
      }
    });

    // Whisper Chat Messages
    fortnite.stream.on('message', (message) => {
      var args = message.message.split(" ");

      switch (args[0]) {
        case "!skin":
            fortnite.me.setCharacter(args[1]);
            message.reply("Skin set to " + args[1]);
          break; 
        case "!emote":
            fortnite.me.setEmote(args[1]);
            message.reply("Dance set to " + args[1]);
            break;
        case "!discord":
            message.reply("Join the discord at discord.gg/fntr");
            break;
      }
    });

    // -- Discord Messages --
    client.on('message', async  (message) => {
      var dPlayers = ''
      var args = message.content.split(" ")

      // Private Commands, for staff and community support only in #lobby channel
      if (message.member.roles.cache.some(role => role.id === '614174010204225716') || message.member.roles.cache.some(role => role.id === '642737555728629772') && (message.channel.id === ADMIN_CHANNEL_ID)) {
        switch (args[0]) {
          case "+listplayers":
            for (var player in players) {
              var profile = await fortnite.launcher.getAccount(players[player]); 
              var displayName = profile.displayName;
              dPlayers += displayName + ': ' + players[player] + '\n'
            }
            client.channels.cache.get(ADMIN_CHANNEL_ID).send({
              embed: {
                color: 3066993,
                title: "Users in the lobby",
                description: dPlayers,
                timestamp: new Date(),
              }
            });
            break;
          case "+kick":
              fortnite.party.kick(args[1]);
              var profile = await fortnite.launcher.getAccount(args[1]); 
              var displayName = profile.displayName;
              client.channels.cache.get(ADMIN_CHANNEL_ID).send({
                embed: {
                  color: 3066993,
                  title: "User kicked from lobby",
                  description: "Player " + displayName + " was kicked from the lobby",
                  timestamp: new Date(),
                }
              });
              break;
          case "+ban":
            fortnite.party.kick(args[1]);
            var profile = await fortnite.launcher.getAccount(args[1]); 
            var displayName = profile.displayName;
            fs.readFile('./blacklist.json', 'utf8', (err, data) => {
              if (err) {
                  console.log("File read failed:", err)
                  return
              }
              var wUsers = JSON.parse(data);
              wUsers.users.push(args[1]);
              fs.writeFile('./blacklist.json', JSON.stringify(wUsers), err => {
                if (err) {
                    console.log('Error writing file', err)
                }
              });
            });
            client.channels.cache.get(ADMIN_CHANNEL_ID).send({
              embed: {
                color: 3066993,
                title: "User has been banned",
                description: ":x: " + displayName + " was banned",
                timestamp: new Date(),
              }
            });
            break;
          case "+unban":
            var profile = await fortnite.launcher.getAccount(args[1]); 
            var displayName = profile.displayName;
            fs.readFile('./blacklist.json', 'utf8', (err, data) => {
              var wUsers = JSON.parse(data);
                if (wUsers.users.includes(args[1])) {
                  wUsers.users.splice(args[1], 1);
                }
              fs.writeFile('./blacklist.json', JSON.stringify(wUsers), err => {
              });
            });
            client.channels.cache.get(ADMIN_CHANNEL_ID).send({
              embed: {
                color: 3066993,
                title: "User has been unbanned",
                description: displayName + " was unbanned",
                timestamp: new Date(),
              }
            });
            break;
        }
      }
      // Public Commands, for everyone in #commands channel
      else if(message.channel.id === PUBLIC_CHANNEL_ID) {
        switch (args[0]) {
          case "+newitems":
              client.channels.cache.get(PUBLIC_CHANNEL_ID).send({
                embed: {
                  color: 3066993,
                  title: "New Item IDs for Bot",
                  description: "All new Fortnite item IDs. Use *+help fortnite* if you need help with usage \n\n" + itemList,
                  timestamp: new Date(),
                }
              });
            break;
          case "+whatis":
            client.channels.cache.get(PUBLIC_CHANNEL_ID).send({
              embed: {
                color: 3066993,
                title: "What is this bot?",
                description: "FNTR Official is a Fortnite lobby bot that hosts 24/7 Team Rumble lobbies for people to enjoy.\n\nFeatures Include:\n-Easy Friending, just add FNTROfficial on Epic and it will auto accept\n-Always running lobby to organize games or meet someone new\n-Ability to change the bots skin and emote, even leaked ones",
                timestamp: new Date(),
                footer: {
                  icon_url: "https://cdn.discordapp.com/avatars/299633935925903360/9b93aa7f702849ad43e4d8743b634cf4.webp?size=128",
                  text: "Developed by Karma Kitten"
                }
              }
            });
            break;
          case "+items":
            client.channels.cache.get(PUBLIC_CHANNEL_ID).send({
              embed: {
                color: 3066993,
                title: "List of all Fortnite item IDs",
                description: "Spreadsheet with all cosmetics: https://docs.google.com/spreadsheets/d/1gVDgnzNyMCafIWa-dBO3mgNUHmHzgA9O5sWbfQy2Yfg/\n\n:warning: Warning, this spreadsheet is large and can take long to load in some situations",
                timestamp: new Date(),
              }
            });
            break;
          case "+help":
            if (args[1] == "fortnite") {
              client.channels.cache.get(PUBLIC_CHANNEL_ID).send({
                embed: {
                  color: 3066993,
                  title: "FNTR Fortnite Bot Commands",
                  description: "Bot commands for the in-game bot and what they do. These must be whispered to the bot to work",
                  timestamp: new Date(),
                  fields : [
                    {
                      name: "!skin {CID of skin}",
                      value: "Sets the skin of the bot. A character id (CID) of a skin is required, use +items or +newitems to get one!"
                    },
                    {
                      name: "!emote {EID of an emote}",
                      value: "Makes the bot emote. An emote id (EID) of an emote is required, use +items or +newitems to get one!"
                    },
                    {
                      name: "!discord",
                      value: "Basically a self-promo command, displays the discord server invite"
                    }
                  ],
                  footer: {
                    icon_url: "https://cdn.discordapp.com/avatars/299633935925903360/9b93aa7f702849ad43e4d8743b634cf4.webp?size=128",
                    text: "Developed by Karma Kitten"
                  }
                }
              });              
            } else {
              client.channels.cache.get(PUBLIC_CHANNEL_ID).send({
                embed: {
                  color: 3066993,
                  title: "FNTR Discord Bot Commands",
                  description: "Bot commands for the discord bot and what they do",
                  timestamp: new Date(),
                  fields : [
                    {
                      name: "+newitems",
                      value: "A list of the newest cosmetics from the most recent Fortnite update. It is in the format **name:id**. CID means it is a skin, EID means it is an emote"
                    },
                    {
                      name: "+items",
                      value: "A link to a spreadsheet with all Fortnite cosmetic IDs to be used by the bot"
                    },
                    {
                      name: "+help fortnite",
                      value: "Shows the commands for the in-game bot used via whispering"
                    },
                    {
                      name: "+whatis",
                      value: "A general description of what this bot is and what it has to offer"
                    }
                  ],
                  footer: {
                    icon_url: "https://cdn.discordapp.com/avatars/299633935925903360/9b93aa7f702849ad43e4d8743b634cf4.webp?size=128",
                    text: "Developed by Karma Kitten"
                  }
                }
              });
            }
            break;
        }
      }
    });
})();

client.login("Njc5MDcyNTU1NzkyODU5Mzkw.XksB9g.2YN0igHAYfxB8AkWV4QVAukoykE");