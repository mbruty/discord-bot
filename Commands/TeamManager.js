const regexHex = RegExp('^#([A-Fa-f0-9]{6})$');
const timeOut = 150000;
module.exports = {

    createTeam: function (message, con) {
        let args = message.content.split(`"`);
        if (typeof args[1] == 'undefined') {
            message.reply(`Usage: \n\`\`\`.create <"Team name"> [Optional: Role colour in hex]\`\`\``).catch(console.err);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            let role = message.guild.roles.cache.find(role => role.name === args[1]);
            let colour = '';
            if (args[2].length == 0)
                colour = '#ffa500';
            else if (regexHex.test(args[2].slice(1)))
                colour = args[2]
            else {
                message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks"));
                message.reply('Colour codes need to be in HEX format, use this link and copy the code https://www.w3schools.com/colors/colors_picker.asp \n\`\`\`Example Hex Code: #ff9933\`\`\`');
            }
            if (role) {
                message.reply(`Team ${args[1]} has already been created`);
                message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
            }
            else if (!role && colour !== '') {
                message.react(message.guild.emojis.cache.find(e => e.name == "Stonks")).catch(console.err);
                //Create the role
                message.guild.roles.create({
                    data: {
                        name: args[1],
                        color: colour,
                    }
                })
                    .then(
                        role => {
                            con.query(`INSERT INTO teams(roleID, teamName) VALUES (${role.id}, '${args[1]}');`);
                            con.query(`INSERT INTO roster(roleID, discordID) VALUES(${role.id}, ${message.member.id});`);
                            message.member.roles.add(role);
                        });

                //Create the leader role
                message.guild.roles.create({
                    data: {
                        name: `${args[1]} leader`,
                        color: colour,
                    }
                })
                    .then(role => message.member.roles.add(role), message.reply(`Created team ${args[2]}!`))
                    .catch(console.err);
            }
        }
    },

    removeTeam: function (message, con) {
        let leaderRole = message.member.roles.cache.find(r => r.name.endsWith("leader"));
        let role = message.member.roles.cache.find(r => r.name == leaderRole.name.substring(0, leaderRole.name.length - 7));
        if (typeof leaderRole== 'undefined') {
            message.reply(`Only the leader can disban their team`).catch(console.err);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            // Delete role
            leaderRole.delete('Disbanded').catch(console.err);
            role.delete('Disbanded');
            let SQL = `DELETE FROM teams WHERE roleID = ${role.id}; DELETE FROM roster WHERE roleID = ${role.id};`;
            con.query(`DELETE FROM teams WHERE roleID = ${role.id};`, (err) => { if (err) console.err });
            con.query(`DELETE FROM roster WHERE roleID = ${role.id};`, (err) => { if (err) console.err });
            console.log(`DELETE FROM teams WHERE roleID = ${ role.id };`);
        }
    },

    uploadAvatar: function (message, con) {

        if (typeof message.attachments.first() == 'undefined') {
            message.reply(`Usage: \n\`\`\`[Attatch an image] <.upload >(in the comment)\`\`\``);
            return;
        }

        let leaderRole = message.member.roles.cache.find(role => role.name.endsWith('leader'));
        let role = message.member.roles.cache.find(r => r.name == leaderRole.name.substring(0, leaderRole.name.length - 7));
        if (typeof leaderRole == 'undefined') {
            message.reply("Only the leader can upload the team picture.");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            con.query(`UPDATE teams SET logoURL = '${message.attachments.first().url}' WHERE roleID = ${role.id};`, (err) => {
                if (err) console.err;
                else message.react(message.guild.emojis.cache.find(e => e.name == "Stonks")).catch(console.err);
            })
        }
    },

    addMember: function (message, con) {
        let leaderRole = message.member.roles.cache.find(r => r.name.endsWith("leader"));
        let role = message.member.roles.cache.find(r => r.name == leaderRole.name.substring(0, leaderRole.name.length - 7));
        let invite = message.mentions.members.first();
        message.delete({ timeout: timeOut });
        if (typeof message.mentions.members.first() == 'undefined ') {
            message.reply(`Usage: \n\`\`\`.add <@user>\`\`\``);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else if (typeof leaderRole == 'undefined') {
            message.reply(`Only the leader can invite people`);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            //Send the invite to the user
            const filter = (reaction, user) => {
                return user.id === invite.id;
            };
            con.query(`SELECT logoURL FROM teams WHERE roleID = ${role.id}`, (err, result) => {
                if (err) console.err;
                else {
                    message.channel.send(`<@${invite.id}>`).then(msg => msg.delete({ timeout: 150000})),
                    message.channel.send({
                        embed: {
                            color: 0x0099ff,
                            title: `You've been invited to ${role.name}`,
                            thumbnail: {
                                url: result[0].logoURL,
                            },
                            fields: [
                                {
                                    name: `Accept ${message.guild.emojis.cache.find(e => e.name == "Checkmark")}`,
                                    value: '\u200b',
                                    inline: true,
                                },
                                {
                                    name: `Decline ${message.guild.emojis.cache.find(e => e.name == "Cross")}`,
                                    value: '\u200b',
                                    inline: true,
                                }],
                            timestamp: new Date(),
                        }
                    })
                        .then(
                            botMessage => {
                                botMessage.react(message.guild.emojis.cache.find(e => e.name == "Checkmark"));
                                botMessage.react(message.guild.emojis.cache.find(e => e.name == "Cross"));
                                botMessage.delete({ timeout: timeOut });
                                const collector = botMessage.createReactionCollector(filter, { time: timeOut });
                                collector.on('collect', reaction => {
                                    if (reaction.emoji.name == "Cross") {
                                        message.reply(`<@${invite.id}> declined your invite`);
                                        botMessage.delete();
                                        message.delete();
                                    }
                                    else if (reaction.emoji.name == "Checkmark") {
                                        con.query(`INSERT INTO roster(roleID, discordID) VALUES (${role.id}, ${invite.id});`, (err) => {
                                            if (err) console.err;
                                            else {
                                                invite.roles.add(role);
                                                message.reply(`<@${invite.id}> accepted your invite and has been added to your team`);
                                                botMessage.delete();
                                            }
                                        });
                                    }
                                })
                            })
                        .catch(console.err);
                }
            })

        }
    },

    removeMember: function (message) {
        let leaderRole = message.member.roles.cache.find(r => r.name.endsWith("leader"));
        let role = message.member.roles.cache.find(r => r.name == leaderRole.name.substring(0, leaderRole.name.length - 7));
        let user = message.mentions.member.first();
        if (typeof leaderRole == undefined) {
            message.reply("Only the leader can kick a person from the team!");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else if (typeof user == undefined) {
            message.reply("Usage:\n```.kick <@user>```");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else if (user == message.author) {
            message.reply("You cannot kick yourself! If you want to disband the team, use ``.disband``");
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else {
            user.roles.remove(role, "Kicked from the team");
            message.react(message.guild.emojis.cache.find(e => e.name == "Stonks")).catch(console.err);
            con.query(`DELETE FROM roster WHERE discordID = ${user.id}`, (err) => { if (err) console.err });
            message.reply(`Kicked ${user} from ${role}`);
        }
    },

    colour: function (message, args) {
        let leaderRole = message.member.roles.cache.find(r => r.name.endsWith("leader"));
        let role = message.member.roles.cache.find(r => r.name == leaderRole.name.substring(0, leaderRole.name.length - 7));
        let colour = '';
        console.log(`"${args[1]}"`);
        if (typeof args[1] == undefined) {
            message.reply(`Usage: \n\`\`\`.colour <Hex colour code>\`\`\``);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks"));
        }
        else if (regexHex.test(args[1]))
            colour = args[1];
        else {
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks"));
            message.reply('Colour codes need to be in HEX format, use this link and copy the code https://www.w3schools.com/colors/colors_picker.asp \n\`\`\`Example Hex Code: #ff9933\`\`\`');
        }
        if (typeof leaderRole == undefined) {
            message.reply(`Only the leader of a team can change the colour`);
            message.react(message.guild.emojis.cache.find(e => e.name == "NotStonks")).catch(console.err);
        }
        else if (!role && colour !== '') {
            role.setColour(colour);
            message.react(message.guild.emojis.cache.find(e => e.name == "Stonks")).catch(console.err);
        }
    }
}