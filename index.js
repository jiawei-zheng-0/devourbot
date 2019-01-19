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
            //console.log('Guild Total :' + rows[0][0]);
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
            //console.log('Data: ' + rows[0][0]);
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
                //console.log('Data: ' + rows[0][0]);
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
                //console.log('Data: ' + rows[0]);
                callback(null, rows[0]);
            } else {
                console.log('No data found.');
            }
        });
    });
}
var sheetName;
function addNewColumn(auth, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    var sheetId;
    var columnNum;
    var request = {
        // The spreadsheet to request.
        spreadsheetId: config.attendanceSheetID,  // TODO: Update placeholder value.
        // The ranges to retrieve from the spreadsheet.
        ranges: [],  // TODO: Update placeholder value.
        // True if grid data should be returned.
        // This parameter is ignored if a field mask was set in the request.
        includeGridData: false,  // TODO: Update placeholder value.

        auth: auth,
    };
    sheets.spreadsheets.get(request, function (err, response) {
        if (err) {
            console.error(err);
            return;
        }

        // TODO: Change code below to process the `response` object:
        sheetName = response.data.sheets[0].properties.title;
        sheetId = response.data.sheets[0].properties.sheetId;
        columnNum = response.data.sheets[0].properties.gridProperties.columnCount;
        const requests = [];
        // Change the spreadsheet's title.
        requests.push({
            appendDimension: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                length: 1
            },
        });
        // Add additional requests (operations) ...
        const batchUpdateRequest = { requests };
        sheets.spreadsheets.batchUpdate({
            spreadsheetId: config.attendanceSheetID,
            resource: batchUpdateRequest
        }, (err, response) => {
            if (err) {
                // Handle error
                console.log(err);
            } else {
                console.log('Column Added');
                callback(null, columnNum);
            }
        });
    });
}
function idToFamilyNames(auth, idList, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
        spreadsheetId: config.attendanceSheetID,
        range: config.IDTable,
    }, (err, res) => {
        if (err) callback('The API returned an error: ' + err);
        if (res != undefined) {
            const rows = res.data.values;
            var nameList = [];
            if (rows.length) {
                console.log(rows);
                for (var i = 0; i < idList.length; i++) {
                    for (var c = 0; c < rows.length; c++) {
                        if (rows[c][0] === idList[i]) {
                            console.log('match' + rows[c][1]);
                            nameList.push(rows[c][1]);
                            break;
                        }
                    }
                }
                for (var a = 0; a < nameList.length; a++) {
                    if (nameList[a].match(/\d/g)) {
                        console.log('Error: No match found for ' + nameList[a]);
                    }
                }
                callback(null, nameList);
            } else {
                console.log('No data found.');
            }
        }
    });
}

function updateAttendanceSheet(auth, nameList, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    var range = sheetName + config.attendanceRange;
    console.log(range);
    sheets.spreadsheets.values.get({
        spreadsheetId: config.attendanceSheetID,
        range: range,
    }, (err, res) => {
        if (err) callback('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log(rows);
            for (var i = 0; i < rows.length; i++) {
                if (nameList.includes(rows[i][0])) {
                    rows[i].push('y');
                }
                else {
                    rows[i].push('n');
                }
            }
            console.log(rows);

            const resource = {
                'values': rows
            };

            sheets.spreadsheets.values.update({
                spreadsheetId: config.attendanceSheetID,
                range: config.attendanceRange,
                valueInputOption: 'USER_ENTERED',
                resource: resource
            }, (err, res) => {
                callback(null, res);
            });

        } else {
            console.log('No data found.');
        }
    });
}

var attendance;//boolean, true if attendance is being taken, false if otherwise
var attendanceSheet;//array of IDs of users whose attendance will be taken of

/*
    Once bot connects to server, sets attendance to false and clears attendanceSheet
*/
client.once('ready', () => {
    console.log(new Date().toLocaleString() + ' Start');
    client.user.setActivity('with lolis');
    //client.user.setActivity('hentai', { type: 'WATCHING' });
    attendance = false;
    attendanceSheet = [];
});

client.on('message', message => {
    //If message was recieved in a text channel
    if (message.channel.type === 'text') {
        //console.log('Message Recieved: ' + message.author.username + ': ' + message.content);
        //Checks if the message matches any commands
        //Check SMH balance
        if (message.content === '$balance') {
            //Role Check
            if (message.member.roles.exists('name', config.memberRole)) {
                console.log(new Date().toLocaleString() + ' Request: Balance request from ' + message.author.username + 'id = ' + message.author.id);
                getBalanceByID(key, message.author.id, function (err, data) {
                    message.author.send('Your SMH total for this week is ' + data);
                    console.log(new Date().toLocaleString() + ' Sent Message to ' + message.author.id + ': Your SMH total for this week is ' + data);
                });
            }
            //Role Check Failed
            else {
                console.log(new Date().toLocaleString() + 'Error: Non Devour Member');
            }
        }
        //Check Guild SMH total balance
        else if (message.content === '$guildbalance') {
            if (message.member.roles.exists('name', config.memberRole)) {
                console.log(new Date().toLocaleString() + ' Request: Guild total request from ' + message.author.username + ' id = ' + message.author.id);
                getGuildBalance(key, function (err, data) {
                    message.author.send('Guild total from SMH since last payout is ' + data);
                    console.log(new Date().toLocaleString() + ' Sent Message to ' + message.author.id + ': Guild total from SMH since last payout is ' + data);
                });
            }
            else {
                console.log(new Date().toLocaleString() + ' Error: Non Devour Member');
            }
        }
        //Check Summary of last SMH trip
        else if (message.content === '$summary') {
            if (message.member.roles.exists('name', config.memberRole)) {
                console.log(new Date().toLocaleString() + ' Request: Summary request from ' + message.author.username + ' id = ' + message.author.id);
                getSummary(key, message.author.id, function (err, data) {
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
                    console.log(new Date().toLocaleString() + ' Sent Message to ' + message.author.id + ': Last trip: ' + summaryText);
                });
            }
            else {
                console.log(new Date().toLocaleString() + ' Error: Non Devour Member');// message not from a devour member
            }
        }
        //Start taking attendance
        else if (message.content === '$startattendance') {
            //Role Check
            if (message.member.roles.exists('name', config.modRole)) {
                //Check whether attendance is currently beign taken
                if (attendance == true) {
                    console.log('Attendence already being taken');
                    message.channel.send('Attendence already being taken');
                }
                else {
                    attendance = true;
                    console.log(new Date().toLocaleString() + ' Attendance Started');
                    message.channel.send('Attendance Started');
                    //Adds a new Column to attendance sheet
                    addNewColumn(key, function (err, data) {
                        return null;
                    });
                    const warChannel = client.channels.get(config.warChannelID);
                    //Pushes all member currently in main war room when command is entered onto the attendance sheet
                    warChannel.members.forEach(function (guildMember, guildMemberId) {
                        attendanceSheet.push(guildMemberId);
                    });
                }
            }
            else {
                console.log(new Date().toLocaleString() + ' Error: Non Devour Member');
            }
        }
        //Stop taking attendance and update the attendance sheet
        else if (message.content === '$endattendance') {
            if (message.member.roles.exists('name', config.modRole)) {
                if (attendance == false) {
                    console.log('Attendence not being taken');
                    message.channel.send('Attendence not being taken');
                }
                else {
                    attendance = false;
                    console.log(new Date().toLocaleString() + ' Attendance stopped');
                    message.channel.send('Attendance stopped');
                    //console.log(attendanceSheet);
                    //Removes duplicate ids on attendance sheet
                    var filteredAttendanceSheet = uniq(attendanceSheet);
                    //Converts Ids to their respective family names
                    idToFamilyNames(key, filteredAttendanceSheet, function (err, data) {
                        console.log(new Date().toLocaleString() + ' Attendance :\n' + data);
                        //Clears attendanceSheet
                        attendanceSheet = [];
                        message.channel.send('Attendance for tonight:\n' + data);
                        //Update Attendance sheet accoding to family names
                        updateAttendanceSheet(key, data, function (err, res) {
                            return null;
                        });
                    });
                }
            }
            else {
                console.log(new Date().toLocaleString() + ' Error: Non Devour Member');
            }
        }
        else if (message.content.includes('loli')) {
            const poggersEmoji = client.emojis.get('443185247107153930');
            message.channel.send('L O L I S ' + poggersEmoji);
        }
        else if (message.content.includes('FBI')) {
            const monkaCopEmoji = client.emojis.get('421812771219570689');
            message.channel.send('WEE WOO WEE WOO ' + monkaCopEmoji);
        }
        else if (message.content.match(/\brin\b/g)) {
            const peepogunEmoji = client.emojis.get('421812739967680523');
            //message.react(peepogunEmoji);
            message.channel.send('' + peepogunEmoji);
        }
        else if (message.isMentioned('534802636822675468')) {
            const peepostreakEmoji = client.emojis.get('450463089775738880');
            //message.react(peepostreakEmoji);
            message.channel.send('' + peepostreakEmoji);
        }
    }
});

/*
    When a new user joins main war room and attendance is currently being taken, push his ID into attendence sheet
*/
client.on('voiceStateUpdate', (oldMember, newMember) => {
    if (attendance == true) {
        const newUserChannel = newMember.voiceChannel;
        //const oldUserChannel = oldMember.voiceChannel;
        //console.log(oldMember + newMember);
        if (newUserChannel != undefined && newUserChannel.id === config.warChannelID) {//user joins mains channel
            //console.log(new Date().toLocaleString() + ' user joined');
            attendanceSheet.push(newMember.user.id);
        }
        // else if (newUserChannel === undefined) {
        //   console.log(newMember.user.username + 'user left' + oldUserChannel);
        //}
    }
});

client.on('error', () => {
    console.log(new Date().toLocaleString() + ' Connection reset');
});

client.login(config.token);

function uniq(a) {
    return Array.from(new Set(a));
}