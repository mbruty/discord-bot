const TicketSystem = require('./Commands/TicketSystem.js');
const TeamManager = require('./Commands/TeamManager.js');
const PlayerManager = require('./Commands/PlayerManager.js');
const MatchManager = require('./Commands/MatchManager.js');
const config = require('./JSON/config.json');
const fs = require('fs');

module.exports = function (message, client, trackers, con, server) {
    let args = message.content.substring(config.prefix.length).split(" ");
    switch (args[0]) {
        case 'ping':
            message.reply('Pong!');
            break;
        //Player manager

        case 'verify':
            PlayerManager.varify(message, args, con);
            break;

        //Match manager
        case 'veto':
            MatchManager.createVeto(message, args, server, con);
            break;
        /*
         * 
         * Ticket system
         * 
         */
        case 'new':
            if (TicketSystem.makeHelpChannel(message, client, trackers, args[1]))
                fs.writeFileSync('./JSON/trackers.json', JSON.stringify(trackers));
            break;
        case 'add':
            TicketSystem.add(message, args[1]);
            break;
        case 'close':
            TicketSystem.close(message);
            break;
        case 'logs':
            TicketSystem.logs(message, con, args);
            break;

        /*
         * 
         * Team management
         * 
         */

        case 'create':
            TeamManager.createTeam(message, con);
        case 'upload':
            TeamManager.uploadAvatar(message, con);
            break;
        case 'invite':
            TeamManager.addMember(message, con);
            break;
        case 'kick':
            TeamManager.removeMember(message);
            break;
        case 'disband':
            TeamManager.removeTeam(message, con);
            break;
        case 'color':
            //Skip forward to colour
        case 'colour':
            TeamManager.colour(message, args);
            break;
        default:
            break;
    }
}