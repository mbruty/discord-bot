const url = "https://cdn.discordapp.com/attachments/693546958723481782/693747617649131550/Mikebruty-01.png";
const Discord = require('discord.js');

module.exports = {

    /*
     * Create the help channel 
     */
    makeHelpChannel: function (message, client, trackers, args) {

        if (typeof args == 'undefined') {
            message.reply("Usage:\n\`\`\`.help <what you need help with>\`\`\`");
            return false;
        }
        else {
            let channelName = "Ticket-" + trackers.ticketNo;
            let topicEmbed = {
                color: 0x0099ff,
                title: `Ticket no ${trackers.ticketNo}`,
                author: {
                    icon_url: url,
                },
                fields: [
                    {
                        name: 'Topic',
                        value: message.content.substring(4)
                    }],
                footer: {
                    text: 'A helper will be with you soon!',
                    icon_url: url,
                },
            };



            message.guild.channels.create(channelName, {
                type: 'text',
                topic: `.add <@user> to add a user; .close once your problem has been resolved`,
                permissionOverwrites: [
                    {
                        id: message.guild.roles.cache.find(r => r.name === "Helper").id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'MANAGE_MESSAGES', 'ATTACH_FILES'],
                    },
                    {
                        id: message.author.id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'ATTACH_FILES'],
                    },
                    {
                        id: message.guild.roles.cache.find(r => r.name === "CSGO").id,
                        deny: ['VIEW_CHANNEL']
                    }
                ],
                parent: message.guild.channels.cache.find(r => r.name === "Tickets").id
            })
                .then(channel => channel.send({ embed: topicEmbed }))
                .catch(console.error);



            trackers.ticketNo++;
            return true;
        }
    },

    add: function (message, args) {
        if (message.channel.name.substring(0, 6) != 'ticket' && message.channel.name.substring(0, 4) != 'logs') {
            message.reply("This can only be used within a ticket channel");
        }
        else {
            if (typeof args == 'undefined') {
                message.reply("Usage:\n\`\`\`.add <@user>\`\`\`");
            }
            else if (message.mentions.roles.size != 0 || message.mentions.channels.size != 0 || message.mentions.everyone) {
                message.reply("You can only invite users").catch(console.error);
            }
            else {
                let counter = 0;
                message.mentions.users.forEach(user => message.channel.createOverwrite(user, {
                        'SEND_MESSAGES': true,
                        'VIEW_CHANNEL': true,
                        'ATTACH_FILES': true,
                        'READ_MESSAGE_HISTORY ': true,
                    }, counter++)
                    .catch(console.error));
                message.reply(`${counter} user(s) have been added!`);
            }
        }
    },

    close: function (message) {
        if (message.channel.name.substring(0, 6) != 'ticket')
            message.channel.delete(`Ticket closed.`);
        else if (message.channel.name.substring(0, 4) != 'logs')
            message.channel.delete();
        else {
            message.reply('I\'m sorry, you can\'t do that here');
        }
    },

    uploadMsg: function (message, con) {
        let msg = message.content.replace(/[\-\,\\\;\'-]/g, "");
        let date = Date();
        let sql = `INSERT INTO ticket_logs (nickName, discordID, messageContents, sentTime, ticketNo) VALUES ( '${message.member.displayName}','${message.author.id}','${msg}','${date.slice(0, 24)}',${parseInt(message.channel.name.slice(7))});`;
        con.query(sql, function (err) { if (err) console.error(err); });
    },

    logs: function (message, con, args) {
        if (!message.member.roles.cache.some(role => role.name === 'Head Admin')) {
            message.reply("Only head admins can use this... Sorry :/");
        }
        else if (args.length === 1) {
            message.reply('Please tag a user or mention a ticket');
        }
        else if (args[1].slice(0, 6) == 'ticket') {
            if (isNaN(args[2]))
                message.reply("Usage:\n\`\`\`.logs ticket <number>\`\`\`");
            else {
                // Print the log
                let SQL = `SELECT * FROM ticket_logs WHERE ticketNo = ${args[2]} ORDER BY sentTime ASC;`;

                //Create the channel
                message.guild.channels.create(`logs-of-ticket-${args[2]}`, {
                    type: 'text',
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.cache.find(r => r.name === "Head Admin").id,
                            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'MANAGE_MESSAGES', 'ATTACH_FILES'],
                        },
                        {
                            id: message.guild.roles.cache.find(r => r.name === "CSGO").id,
                            deny: ['VIEW_CHANNEL']
                        }
                    ],
                    parent: message.guild.channels.cache.find(r => r.name === "Tickets").id
                })
                    .then(channel => {
                        con.query(SQL, (err, rows) => {
                            rows.forEach((row) => {
                                channel.send(`Sender: ${row.Username}\nMessage:\n\`\`\`${row.MessageContense}\`\`\``)
                                    .catch(console.err);
                            })
                        })
                    })
                    .catch(console.error);
            }

        }
        else if (message.mentions.members.length !== 'undefined') {
            //Print all the tickets
            let tagged = message.mentions.users.first().id;
            let SQL = `SELECT ticketNo, nickName, sentTime FROM ticket_logs WHERE discordId = \'${tagged}\' GROUP BY ticketNo ORDER BY Time DESC LIMIT 8;`;
            con.query(SQL, [], (err, rows) => {
                if (err) { console.err }
                else {
                    const replyEmbed = new Discord.MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`Logs for ${tagged}`)
                        .setTimestamp()
                        .setFooter(`Most recent ${rows.length} logs - max 8`)
                    rows.forEach((row) => {
                        replyEmbed.addField(`Log number:`, row.TicketNo, true), replyEmbed.addField('Date:', row.Time, true), replyEmbed.addField('\u200B', '\u200B', true) });
                    message.channel.send({ embed: replyEmbed });
                }
            })
        }
    }
}