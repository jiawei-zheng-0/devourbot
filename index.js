const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), initSheetConnection);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

var key;
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);
    key = oAuth2Client;

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function initSheetConnection(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetID,
        range: config.totalRange,
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Guild Total :' + rows[0][0]);
        } else {
            console.log('No data found.');
        }
    });
}
function getGuildBalance(auth, callback) { // gets guild total from shreadsheet cell=totalRange
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetID,
        range: config.totalRange,
    }, (err, res) => {
        if (err) callback('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Data: ' + rows[0][0]);
            callback(null, rows[0][0]);
        } else {
            console.log('No data found.');
        }
    });
}
function getBalanceByID(auth, id, callback) { //  gets individual total by updating cell=idcell, which in turn updates cell=individualTotalCell with that id's total, and returns it
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        'values': [
            [
                id
            ]
        ]
    };
    sheets.spreadsheets.values.update({//update idcell with id
        spreadsheetId: config.sheetID,
        range: config.idCell,
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }, (err, res) => {
        if (err) console.log('Error in updating Cell, the API returned an error: ' + err);
        //var result = res.result;
        //console.log(result);
        sheets.spreadsheets.values.get({//gets individualTotalCell and returns it
            spreadsheetId: config.sheetID,
            range: config.individualTotalCell,
        }, (err, res) => {
            if (err) callback('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                console.log('Data: ' + rows[0][0]);
                callback(null, rows[0][0]);
            } else {
                console.log('No data found.');
            }
        });
    });
}

function getSummary(auth, id, callback) {//updates summaryIDCell with id, and returns array of last trip values
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        'values': [
            [
                id
            ]
        ]
    };
    sheets.spreadsheets.values.update({//update summaryIDCell with id
        spreadsheetId: config.sheetID,
        range: config.summaryIDCell,
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }, (err, res) => {
        if (err) console.log('Error in updating Cell, the API returned an error: ' + err);
        //var result = res.result;
        //console.log(result);
        sheets.spreadsheets.values.get({//gets a array of values from last trip
            spreadsheetId: config.sheetID,
            range: config.summaryRange,
        }, (err, res) => {
            if (err) callback('The API returned an error: ' + err);
            const rows = res.data.values;
            if (rows.length) {
                console.log('Data: ' + rows[0]);
                callback(null, rows[0]);
            } else {
                console.log('No data found.');
            }
        });
    });
}

client.once('ready', () => {
    console.log('Start');
});

client.on('message', message => {
    if (message.channel.type === 'text') {// message in text channel
        console.log('Message Recieved: ' + message.author.username + ': ' + message.content);
        if (message.content === '$balance') {//if message is $balance
            if (message.member.roles.exists('name', 'Devour')) {// message from a devour member
                console.log('Request: Balance request from ' + message.author.username + 'id = ' + message.author.id);
                getBalanceByID(key, message.author.id, function(err, data) {
                    message.author.send('Your balance for this week is ' + data);
                    console.log('Sent Message to ' + message.author.id + ': Your for this week is ' + data);
                });
            }
            else {
                console.log('Error: Non Devour Member');// message not from a devour member
            }
        }
        else if (message.content === '$guildbalance') {//if message is $guildbalance
            if (message.member.roles.exists('name', 'Devour')) {// message from a devour member
                console.log('Request: Guild total request from ' + message.author.username + ' id = ' + message.author.id);
                getGuildBalance(key, function(err, data) {
                    message.author.send('Guild total for this week is ' + data);
                    console.log('Sent Message to ' + message.author.id + ': Guild total for this week is ' + data);
                });
            }
            else {
                console.log('Error: Non Devour Member');// message not from a devour member
            }
        }
        else if (message.content === '$summary') {//if message is $summary
            if (message.member.roles.exists('name', 'Devour')) {// message from a devour member
                console.log('Request: Summary request from ' + message.author.username + ' id = ' + message.author.id);
                getSummary(key, message.author.id, function(err, data) {
                    var summaryText = 'Time: ' + data[0]
                        + '\nFamily Name: ' + data[1];
                    if (data[2] != '')
                        summaryText += '\nDeckhand 1 Family Name: ' + data[2];
                    if (data[3] != '')
                        summaryText += '\nDeckhand 2 Family Name: ' + data[3];
                    if (data[4] != '')
                        summaryText += '\nDeckhand 3 Family Name: ' + data[4];
                    if (data[5] != '')
                        summaryText += '\nDeckhand 4 Family Name: ' + data[5];
                    if (data[22] != '')
                        summaryText += '\nTotal Value: ' + data[22];
                    if (data[23] != '')
                        summaryText += '\nSplit amount: ' + data[23];
                    if (data[6] != '')
                        summaryText += '\nSea Monster Neidans: ' + data[6];
                    if (data[7] != '')
                        summaryText += '\nOcean Stalker\'s Skin: ' + data[7];
                    if (data[8] != '')
                        summaryText += '\nOcean Stalker Whiskers: ' + data[8];
                    if (data[9] != '')
                        summaryText += '\nHekaru\'s Spike: ' + data[9];
                    if (data[10] != '')
                        summaryText += '\nAmethyst Hekaru Spikes: ' + data[10];
                    if (data[11] != '')
                        summaryText += '\nCandidum Shells: ' + data[11];
                    if (data[12] != '')
                        summaryText += '\nSTEEL Candidum Shells: ' + data[12];
                    if (data[13] != '')
                        summaryText += '\nNineshark\'s Horns Fragments: ' + data[13];
                    if (data[14] != '')
                        summaryText += '\nNineshark Fins: ' + data[14];
                    if (data[15] != '')
                        summaryText += '\nBlack Rust Jawbones: ' + data[15];
                    if (data[16] != '')
                        summaryText += '\nBlack Rust Tongues: ' + data[16];
                    if (data[17] != '')
                        summaryText += '\nGoldmont Pirate Coins: ' + data[17];
                    if (data[18] != '')
                        summaryText += '\nGoldmont Pirate Goblets: ' + data[18];
                    if (data[19] != '')
                        summaryText += '\nScreenshot of inventory items: ' + data[19];
                    if (data[20] != '')
                        summaryText += '\nScreenshot of guild funds BEFORE turn in: ' + data[20];
                    if (data[21] != '')
                        summaryText += '\nScreenshot of guild funds AFTER turn in: ' + data[21];
                    message.author.send('Last trip: \n' + summaryText);
                    console.log('Sent Message to ' + message.author.id + ': Last trip: ' + summaryText);
                });
            }
            else {
                console.log('Error: Non Devour Member');// message not from a devour member
            }
        }
        if (message.content.includes('loli')) {
            const poggersEmoji = client.emojis.get('443185247107153930');
            message.channel.send('L O L I S ' + poggersEmoji);
        }
        if (message.content.includes('FBI')) {
            const monkaCopEmoji = client.emojis.get('421812771219570689');
            message.channel.send('WEE WOO WEE WOO ' + monkaCopEmoji);
        }
        if (message.content.match(/\brin\b/g)) {
            const peepogunEmoji = client.emojis.get('421812739967680523');
            message.react(peepogunEmoji);
        }
        if (message.isMentioned('534802636822675468')) {
            const peepostreakEmoji = client.emojis.get('450463089775738880');
            message.react(peepostreakEmoji);
        }
    }
});
client.on('error', () => {
    console.log('Connection reset');
});

client.login(config.token);
