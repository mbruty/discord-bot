'use strict';

const TicketSystem = require('./Commands/TicketSystem.js');
const Discord = require('discord.js');
const config = require('./JSON/config.json');
let trackers = require('./JSON/trackers.json');
const mysql = require('mysql');
const rcon = require('rcon-srcds');
const commands = require("./commands.js");
const server = new rcon({host : config.CSGOhost, port : config.CSGOport});
const client = new Discord.Client();

var con = mysql.createConnection({
    host: config.SQLhost,
    user: config.SQLuser,
    password: config.SQLpw,
    database: config.db
});


client.on('ready', () => {
    console.log(`Powering up ${client.user.tag}!`);
});

client.on('message', msg => {
    //Upload the message to the SQL server if the message is in tickets
    if (msg.channel.name.slice(0, 6) == 'ticket' && !msg.author.bot) {
        TicketSystem.uploadMsg(msg, con);
    }
    if (msg.content.startsWith(config.prefix)) {
        commands(msg, client, trackers, con, server);
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (oldMember.displayName != newMember.displayName)
        con.query(`UPDATE players SET nickName = '${newMember.displayName}' WHERE discordID = ${newMember.id}`, (err) => { if(err) console.log(err) });
})

server.authenticate(config.rconPW)
    .then(() => {
        console.log('Authenticated with game server!');
        connectedToServer = true;
        return server.execute('status');
    });

client.login(config.token);