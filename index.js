const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');

client.once('ready', () => {
    console.log('Start');
});

client.on('message', message => {
    console.log(message.content);
    /*
    if (message.content.includes('loli')) {
        message.channel.send('L O L I S :POGGERS:');
    }
    */
    if (message.content === '$balance') {
        console.log('Balance request from ' + message.author.username + 'id = ' + message.author.id);
        message.author.send('Your balance for this week is ');
    }
    else if (message.content === '$guildbalance') {
        console.log('Guild total request from ' + message.author.id);
        message.author.send('Guild total for this week is ');
}

});

client.login(config.token);