var getJSON = require('get-json');
const steamID64Regex = RegExp('^([0-9]{17})$');
const config = require('../JSON/config.json');
const timeOut = 150000;

module.exports = {

    varify: function (message, args, con) {
        if (typeof args[1] == undefined) {
            message.reply("Usage:\n```.verify <steamID64>```\nYou can get your steamID64 from http://www.steamrep.com");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else if (!steamID64Regex.test(args[1])) {
            message.reply("Error in the SteamID64. You can get your steamID64 from http://www.steamrep.com \n```Example SteamID: 76561198068913245```");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            message.react(message.guild.emojis.cache.find(e => e.name == "Stonks")).catch(console.err);
            getJSON(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steamAPIKey}&steamids=${args[1]}`, (error, response) => {
                if (error) {
                    console.error;
                    return;
                }
                const filter = (reaction, user) => {
                    return user.id == message.member.id;
                };
                let player = response.response.players[0];
                message.channel.send({
                    embed: {
                        color: 0x0099ff,
                        title: `Is this your steam account?`,
                        thumbnail: {
                            url: response.response.players[0].avatarmedium,
                        },
                        fields: [
                            {
                                name: `Name: `,
                                value: player.personaname,
                                inline: true,
                            },
                            {
                                name: `Country: `,
                                value: `${player.loccountrycode} :flag_${player.loccountrycode.toLowerCase()}:`,
                                inline: true,
                            },
                            {
                                name: `Steam Account: `,
                                value: player.profileurl,
                                inline: false,
                            },
                            {
                                name: `Yes ${message.guild.emojis.cache.find(e => e.name == "Checkmark")}`,
                                value: '\u200b',
                                inline: true,
                            },
                            {
                                name: `No ${message.guild.emojis.cache.find(e => e.name == "Cross")}`,
                                value: '\u200b',
                                inline: true,
                            }],
                        timestamp: new Date(),
                    }
                }).then(botMessage => {
                    botMessage.react(message.guild.emojis.cache.find(e => e.name == "Checkmark"));
                    botMessage.react(message.guild.emojis.cache.find(e => e.name == "Cross"));
                    botMessage.delete({ timeout: timeOut });
                    const collector = botMessage.createReactionCollector(filter, { time: timeOut });
                    collector.on('collect', reaction => {
                        if (reaction.emoji.name == "Cross") {
                            botMessage.delete();
                            message.delete();
                        }
                        else if (reaction.emoji.name == "Checkmark") {
                            con.query(`INSERT INTO players(steamID, nickName, discordID) VALUES (${args[1]}, '${message.member.displayName}', ${message.member.id});`, (err) => {
                                if (err.errno == 1062) {
                                    message.reply(`I already have a discord account linked to that steam ID or discord ID! Contact Mike to fix this!`);
                                }
                                else {
                                    console.log(err);
                                }
                            });
                            botMessage.delete();
                        }
                    });
                });
            });
        }
    }
}