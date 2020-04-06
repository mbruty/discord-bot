'use strict';

const fs = require('fs');
const tracker = require('../JSON/trackers.json');
const config = require('../JSON/config.json');
const Discord = require('discord.js');
var generator = require('generate-password');
const ftp = require("basic-ftp")


function bestOfOne(channel, teamOne, teamTwo, bestOf, server, con) {
    let vetoEmbed = createVetoEmbed(teamOne, teamTwo, `.ban <map name>`);
    let finished = false;
    let turn = teamOne;
    channel.send(`@${teamOne.name} VS @${teamTwo.name}`);
    // vetoEmbed.fields[0] = { name: 'Edited', value: '\u200b', inline: true };
    channel.send({ embed: vetoEmbed }).then(embed => {

        let bannedMaps = [];
        let pickedMaps = [];
        let sides = [];
        let pickedMapIndex = [0];
        let mapsRemaining = 7;
        let maps = ['dust2', 'mirage', 'inferno', 'train', 'nuke', 'overpass', 'vertigo'];
        let canPickMap = false;

        //Create a message collector for the veto channel with a length of 20 mins
        const filter = () => { return true };
        const collector = new Discord.MessageCollector(channel, filter, { time: 1200000 });
        collector.on('collect', message => {
            let newEmbed = embed.toJSON();
            let offset = 0;
            if (turn == teamTwo)
                offset = 2;
            console.log(offset);
            if (message.member.roles.cache.find(r => r == turn)) {
                let args = message.content.substring(config.prefix.length).split(" ");
                if (args[0] == "ban") {
                    if (bestOf == 3 && mapsRemaining == 5 || bestOf == 3 && mapsRemaining == 4) {
                        message.reply("You need to pick a map! Usage:\n```.pick <map> ```");
                    }
                    else {
                        if (banMap(args, bannedMaps, vetoEmbed, maps, offset, message)) {
                            turn = (turn == teamOne ? teamTwo : teamOne);
                            vetoEmbed.description = `${turn.name} to vote`;
                            embed.edit({ embed: vetoEmbed });
                            mapsRemaining -= 1;
                        }
                    }
                }
                else if (args[0] == "pick") {
                    if (!canPickMap) {
                        if (bestOf == 3 && mapsRemaining == 5 || bestOf == 3 && mapsRemaining == 4) {
                            if (pickMap(args, pickedMaps, vetoEmbed, maps, pickedMapIndex, offset, message)) {
                                turn = (turn == teamOne ? teamTwo : teamOne);
                                vetoEmbed.description = `${turn.name} to vote`;
                                embed.edit({ embed: vetoEmbed });
                                mapsRemaining -= 1;
                                canPickMap = true;
                                console.log(canPickMap);
                            }
                        }
                        else {
                            message.reply("You need to ban a map! Usage:\n ```.ban <map>```");
                        }
                    }
                    else {
                        message.reply("You have to pick a side! Usage:\n```.side <t / ct>");
                    }
                }
                else if (args[0] == "side") {
                    if (canPickMap) {
                        if (args[1] == "ct") {
                            if (turn == teamOne) {
                                vetoEmbed.fields[pickedMapIndex[0] - 1] = { name: message.guild.emojis.cache.find(e => e.name == "CT_EZ"), value: '\u200b', inline: true };
                                sides.push("team1_ct");
                            }
                            else if (turn == teamTwo) {
                                vetoEmbed.fields[pickedMapIndex[0] + 1] = { name: message.guild.emojis.cache.find(e => e.name == "CT_EZ"), value: '\u200b', inline: true };
                                sides.push("team1_t");
                            }
                        }
                        else if (args[1] == "t") {
                            if (turn == teamOne) {
                                vetoEmbed.fields[pickedMapIndex[0] - 1] = { name: message.guild.emojis.cache.find(e => e.name == "terrorist_EZ"), value: '\u200b', inline: true };
                                sides.push("team1_t");
                            }
                            else if (turn == teamTwo) {
                                vetoEmbed.fields[pickedMapIndex[0] + 1] = { name: message.guild.emojis.cache.find(e => e.name == "terrorist_EZ"), value: '\u200b', inline: true };
                                sides.push("team1_ct");
                            }
                        }
                        embed.edit({ embed: vetoEmbed });
                        canPickMap = false;
                    }
                    else {
                        message.reply("You can't pick a side yet!");
                    }
                }
                if (mapsRemaining == 1) {
                    finished = true;
                    pickedMaps.push(`de_${maps.filter(x => x != undefined)[0]}`);
                    displayServerInfo(server, embed, teamOne, teamTwo, sides, pickedMaps);
                    craftMatch(teamOne, teamTwo, con, pickedMaps, sides, server);
                }
            }
            message.delete();
        });
        collector.on('end', () => { if (!finished) channel.send("Veto timed out") });
    }).catch(e => { console.log(e.message) });
}


module.exports = {


    createVeto: function (message, args, server, con) {
        if (!message.member.roles.cache.find(r => r.name == "Head Admin")) {
            message.delete();
        }
        else {
            let teamOne = message.mentions.roles.last();
            let teamTwo = message.mentions.roles.first();
            let bestOf;
            if (args[3] == undefined)
                bestOf = 1;
            else if (args[3] == "3")
                bestOf = 3;
            message.guild.channels.create(`Match ${tracker.matchNo}`, {
                type: 'text',
                topic: 'VETO For match ',
                permissionOverwrites: [
                    {
                        id: message.guild.roles.cache.find(r => r.name === "Head Admin").id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'MANAGE_MESSAGES', 'ATTACH_FILES'],
                    },
                    {
                        id: teamOne.id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                    },
                    {
                        id: teamTwo.id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                    },
                    {
                        id: message.guild.roles.cache.find(r => r.name === "CSGO").id,
                        deny: ['VIEW_CHANNEL']
                    }
                ],
                parent: message.guild.channels.cache.find(c => c.name == "LIVE MATCHES")
            }).then(channel => { bestOfOne(channel, teamOne, teamTwo, bestOf, server, con); })
        }
    },

    techPause: function (message, server) {
        if (msg.channel.name.slice(0, 5) == 'match') {
            server.execute('')
        }
    }
}

function displayServerInfo(server, embed, teamOne, teamTwo, sides, maps) {
    let serverPassword = generator.generate({
        length: 10,
        numbers: true
    });
    let formattedSides = [];
    for (let side of sides) {
        if (side == "team1_t")
            formattedSides.push(`${teamOne.name} start T`);
        if (side == "team1_ct")
            formattedSides.push(`${teamOne.name} start CT`);
    }
    formattedSides.push(`Knife to decide`);
    server.execute(`sv_password ${serverPassword}`);
    embed.edit({
        embed: {
            color: 0x708090,
            title: `Match ${teamOne.name} VS ${teamTwo.name}`,
            description: `\u200b`,
            fields: [
                {
                    name: `Map:`,
                    value: maps.filter(x => x != undefined),
                    inline: false,
                },
                {
                    name: `Side type:`,
                    value: formattedSides,
                    inline: false,
                },
                {
                    name: `IP`,
                    value: `${config.CSGOhost}:${config.CSGOport}`,
                    inline: true,
                },
                {
                    name: `Password: `,
                    value: `${serverPassword}`,
                    inline: true,
                },
                {
                    name: `Copy me: `,
                    value: `\`\`\`connect ${config.CSGOhost}:${config.CSGOport}; password ${serverPassword}\`\`\``,
                    inline: false,
                }
            ],
            timestamp: new Date(),
            footer: `\u200b`,
        }
    });
}

function banMap(args, bannedMaps, vetoEmbed, maps, offset, message) {
    switch (args[1].toLowerCase()) {
        case 'dust2':
            bannedMaps.push('dust2');
            vetoEmbed.fields[3 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[4] = { name: '~~Dust 2~~', value: '\u200b', inline: true };
            delete maps[0];
            break;
        case 'mirage':
            bannedMaps.push('mirage');
            vetoEmbed.fields[6 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[7] = { name: '~~Mirage~~', value: '\u200b', inline: true };
            delete maps[1];
            break;
        case 'inferno':
            bannedMaps.push('inferno');
            vetoEmbed.fields[9 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[10] = { name: '~~Inferno~~', value: '\u200b', inline: true };
            delete maps[2];
            break;
        case 'train':
            bannedMaps.push('train');
            vetoEmbed.fields[12 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[13] = { name: '~~Train~~', value: '\u200b', inline: true };
            delete maps[3];
            break;
        case 'nuke':
            bannedMaps.push('nuke');
            vetoEmbed.fields[15 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[16] = { name: '~~Nuke~~', value: '\u200b', inline: true };
            delete maps[4];
            break;
        case 'overpass':
            bannedMaps.push('overpass');
            vetoEmbed.fields[18 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[19] = { name: '~~Overpass~~', value: '\u200b', inline: true };
            delete maps[5];
            break;
        case 'vertigo':
            bannedMaps.push('vertigo');
            vetoEmbed.fields[21 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Cross"), value: '\u200b', inline: true };
            vetoEmbed.fields[22] = { name: '~~Vertigo~~', value: '\u200b', inline: true };
            delete maps[6];
            break;
        default:
            return false;
            message.reply("Usage:\n```.ban <map to ban>");
            break;
    }
    return true;
}

function pickMap(args, pickedMaps, vetoEmbed, maps, pickedMapIndex, offset, message) {
    switch (args[1].toLowerCase()) {
        case 'dust2':
            pickedMaps.push('de_dust2');
            vetoEmbed.fields[3 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[4] = { name: '***Dust 2***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 4;
            delete maps[0];
            break;
        case 'mirage':
            pickedMaps.push('de_mirage');
            vetoEmbed.fields[6 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[7] = { name: '***Mirage***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 7;
            delete maps[1];
            break;
        case 'inferno':
            pickedMaps.push('de_inferno');
            vetoEmbed.fields[9 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[10] = { name: '***Inferno***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 10;
            delete maps[2];
            break;
        case 'train':
            pickedMaps.push('de_train');
            vetoEmbed.fields[12 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[13] = { name: '***Train***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 13;
            delete maps[3];
            break;
        case 'nuke':
            pickedMaps.push('de_nuke');
            vetoEmbed.fields[15 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[16] = { name: '***Nuke***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 16;
            delete maps[4];
            break;
        case 'overpass':
            pickedMaps.push('de_overpass');
            vetoEmbed.fields[18 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[19] = { name: '***Overpass***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 19;
            delete maps[5];
            break;
        case 'vertigo':
            pickedMaps.push('de_vertigo');
            vetoEmbed.fields[21 + offset] = { name: message.guild.emojis.cache.find(e => e.name == "Checkmark"), value: '\u200b', inline: true };
            vetoEmbed.fields[22] = { name: '***Vertigo***', value: '\u200b', inline: true };
            pickedMapIndex[0] = 22;
            delete maps[6];
            break;
        default:
            return false;
            message.reply("Usage:\n```.pick <map to pick>");
            break;
    }
    return true;
}

function craftMatch(teamOne, teamTwo, con, maps, sides, server) {
    //Get team one's info
    con.query(`SELECT players.steamID AS steamID, players.nickName AS nick FROM players INNER JOIN roster ON players.discordID = roster.discordID INNER JOIN teams ON roster.roleID = teams.roleID WHERE teams.roleID = ${teamOne.id};`, (err, result) => {
        if (err) console.log(err);
        else {
            con.query(`SELECT players.steamID AS steamID, players.nickName AS nick FROM players INNER JOIN roster ON players.discordID = roster.discordID INNER JOIN teams ON roster.roleID = teams.roleID WHERE teams.roleID = ${teamTwo.id};`, (err2, result2) => {
                if (err2) console.log(err2);
                else {
                    sides.push("knife");
                    console.log("test");
                    let teamOneIDs = {};
                    for (let row of result)
                        teamOneIDs[row.steamID] = row.nick;

                    let teamTwoIDs = {};
                    for (let row of result2)
                        teamTwoIDs[row.steamID] = row.nick;

                    let matchJSON = {
                        "matchid": `ManiCS league match: ${tracker.matchNo}`,
                        "num_maps": maps.length,
                        "players_per_team": 5,
                        "min_players_to_ready": 1,
                        "min_spectators_to_ready": 0,
                        "skip_veto": true,
                        "map_sides": sides,
                        "maplist": maps,
                        "team1": {
                            "name": `${teamOne.name}`,
                            "players": teamOneIDs,
                        },
                        "team2": {
                            "name": `${teamTwo.name}`,
                            "players": teamTwoIDs,
                        },
                        "match_title": `${teamOne.name} VS ${teamTwo.name} | {MAPNUMBER}`,
                    }
                    fs.writeFileSync('match.json', JSON.stringify(matchJSON));
                    uploadMatch();
                    server.execute('get5_endmatch');
                    server.execute('get5_loadmatch botmatch.json');
                }
            });
        }
    });
}

async function uploadMatch() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: config.FTPhost,
            user: config.FTPUsername,
            password: config.FTPPassword,
            secure: false
        });
        await client.uploadFrom("./match.json", "./botmatch.json");
    }
    catch (err) {
        console.log(err);
    }
    client.close;
}

function createVetoEmbed(teamOne, teamTwo, footerText) {
    return {
        color: 0x708090,
        title: `Match veto: ${teamOne.name} VS ${teamTwo.name}`,
        description:`${ teamOne.name } to vote`,
        fields: [
            {
                name: `${teamOne.name}`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `${teamTwo.name}`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Dust 2`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Mirage`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Inferno`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Train`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Nuke`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Overpass`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `Vertigo`,
                value: `\u200b`,
                inline: true,
            },
            {
                name: `\u200b`,
                value: `\u200b`,
                inline: true,
            },
        ],
        timestamp: new Date(),
        footer: footerText,
    }
}