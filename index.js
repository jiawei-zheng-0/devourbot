const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');

client.once('ready', () => {
    console.log('Start');
});

client.on('message', message => {
    console.log(message.content);
    if (message.channel.type === 'text') {// message in text channel
        if (message.member.roles.exists('name', 'Devour')) {// message from a devour member
            console.log('Devour Member');
            if (message.content === '$balance') {
                console.log('Balance request from ' + message.author.username + 'id = ' + message.author.id);
                message.author.send('Your balance for this week is ' + message.channel.name);
            }
            else if (message.content === '$guildbalance') {
                console.log('Guild total request from ' + message.author.id);
                message.author.send('Guild total for this week is ' + message.channel.name);
            }
        }
        else {
            console.log('Non Devour Member');// message not from a devour member
        }
    }
    /*
    if (message.content.includes('loli')) {
        message.channel.send('L O L I S :POGGERS:');
    }
    */
});

client.login(config.token);