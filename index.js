const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const util = require('util');
const log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
const log_stdout = process.stdout;

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

console.log = function(d) { //Log to file and console
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

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
/*
    Gets the guild total balance from SMH
*/
function getGuildBalance(auth, callback) {
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
/*
    Gets Balance for param id
*/
function getBalanceByID(auth, id, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    const resource = {
        'values': [
            [
                id
            ]
        ]
    };
    //Updates cell with id
    sheets.spreadsheets.values.update({
        spreadsheetId: config.sheetID,
        range: config.idCell,
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }, (err, res) => {
        if (err) console.log('Error in updating Cell, the API returned an error: ' + err);
        //var result = res.result;
        //console.log(result);
        //Gets result cell with Balance
        sheets.spreadsheets.values.get({
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
/*
    Gets Summary of last Form entry matching id
*/
function getSummary(auth, id, callback) {
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        'values': [
            [
                id
            ]
        ]
    };
    //Update Cell with id
    sheets.spreadsheets.values.update({
        spreadsheetId: config.sheetID,
        range: config.summaryIDCell,
        valueInputOption: 'USER_ENTERED',
        resource: resource
    }, (err, res) => {
        if (err) console.log('Error in updating Cell, the API returned an error: ' + err);
        //var result = res.result;
        //console.log(result);
        //Get result array of last form entry
        sheets.spreadsheets.values.get({
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

var sheetName;//Sheet name stores the name of the first sheet in attendance spreadsheet
/*
    Adds a new column to attendance spreadsheet
*/
function addNewColumn(auth, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    var sheetId;
    var columnNum;
    var request = {
        spreadsheetId: config.attendanceSheetID,
        ranges: [],
        includeGridData: false,
        auth: auth,
    };
    sheets.spreadsheets.get(request, function (err, response) {
        if (err) {
            console.error(err);
            return;
        }
        //Get name of 1st sheet
        sheetName = response.data.sheets[0].properties.title;
        //Get ID of 1st sheet
        sheetId = response.data.sheets[0].properties.sheetId;
        //get number of columns in 1st sheet
        columnNum = response.data.sheets[0].properties.gridProperties.columnCount;
        const requests = [];
        requests.push({
            appendDimension: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                length: 1
            },
        });
        const batchUpdateRequest = { requests };
        sheets.spreadsheets.batchUpdate({
            spreadsheetId: config.attendanceSheetID,
            resource: batchUpdateRequest
        }, (err, response) => {
            if (err) {
                console.log(err);
            } else {
                //console.log('Column Added');
                callback(null, columnNum);
            }
        });
    });
}
/*
    Takes a list of IDs and returns a list of family names associated with the IDs accoding to spreadsheet
    Ids with no matching Family names remain ids
*/
function idToFamilyNames(auth, idList, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    /*
        Gets an array of arrays containg id and family names
        [[123,'family1'],[234,'faimly2'],...]
    */
    sheets.spreadsheets.values.get({
        spreadsheetId: config.attendanceSheetID,
        range: config.IDTable,
    }, (err, res) => {
        if (err) callback('The API returned an error: ' + err);
        if (res != undefined) {
            const rows = res.data.values;
            var nameList = [];
            var unfoundIDList = [];
            if (rows.length) {
                //console.log(rows);
                //Matches ids from idList to ids from sheet, if found, push name to nameList
                for (var i = 0; i < idList.length; i++) {
                    for (var c = 0; c < rows.length; c++) {
                        if (rows[c][0] === idList[i]) {
                            //console.log('match' + rows[c][1]);
                            nameList.push(rows[c][1].toLowerCase());
                            break;
                        }
                        if (c === rows.length - 1) {//If reached end of list without matching ID, id is not on id table
                            console.log('Error: No match found for ' + idList[i]);
                            unfoundIDList.push(idList[i]);
                        }
                    }
                }
                //If any nameList entry contains numbers, that means id didnt match any family name
                //for (var a = 0; a < nameList.length; a++) {
                //    if (nameList[a].match(/\d/g)) {
                //        console.log('Error: No match found for ' + nameList[a]);
                //    }
                //console.log(unfoundIDList);
                callback(null, nameList, unfoundIDList);
            } else {
                console.log('No data found.');
            }
        }
    });
}

/*
    Takes a list of family names and updates attendace spreadsheet by adding a new column with y/n
*/
function updateAttendanceSheet(auth, nameList, callback) {
    const sheets = google.sheets({ version: 'v4', auth });
    var range = sheetName + config.attendanceRange;
    //console.log(range);
    /*
        Gets a table of Family names and their attendance
        [[family1,note,y,n,n,...],[family2,note,y,y,n,...],...]
    */
    sheets.spreadsheets.values.get({
        spreadsheetId: config.attendanceSheetID,
        range: range,
    }, (err, res) => {
        if (err) callback('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            //console.log(rows);
            //Iterates through Table rows, if family name is on nameList, add a y to end of its row, if not add a n
            for (var i = 0; i < rows.length; i++) {
                var famName = rows[i][0];
                //If match
                if (nameList.includes(famName.toLowerCase())) {
                    rows[i].push('y');
                    //for (var b = 0; b < nameList.length - 1; b++) {
                    //    if (nameList[b] === famName) {
                    //        nameList.splice(b, 1);
                    //    }
                    //}
                    //Remove matched name from nameList
                    var index = nameList.indexOf(famName.toLowerCase());
                    if (index !== -1) nameList.splice(index, 1);
                }
                else {
                    rows[i].push('n');
                }
            }
            //console.log(rows);


            const resource = {
                'values': rows
            };
            //Updates the table on the sheet with the updated attendance
            sheets.spreadsheets.values.update({
                spreadsheetId: config.attendanceSheetID,
                range: config.attendanceRange,
                valueInputOption: 'USER_ENTERED',
                resource: resource
            }, (err, res) => {
                callback(null, nameList);
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
        if (message.content === '$commands') {
            var reply = '`\nCommands:\nDevour Exclusive:\n$balance - Check your SMH total since last payout' +
                '\n$guildbalance - Check guild\'s SMH total since last payout' +
                '\n$summary - View Summary of your last submitted SMH form' +
                '\n$commands - View list of commands for the bot`';
            message.reply(reply);
        }
        else if (message.content === '$balance') {
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
                    idToFamilyNames(key, filteredAttendanceSheet, function (err, data, notFoundIds) {
                        console.log(new Date().toLocaleString() + ' Attendance :\n' + data);
                        //Clears attendanceSheet
                        attendanceSheet = [];
                        var names = data.sort().toString().replace(/,/g, '\n');
                        message.channel.send('Attendance for tonight:\nTotal attendance: ' + data.length + '\n' + names);
                        if (notFoundIds.length != 0) {
                            //add on family names for unfoundids
                            for (var c = 0; c < notFoundIds.length; c++) {
                                notFoundIds[c] = (notFoundIds[c] + ' : ' + client.users.get(notFoundIds[c]).username);//message.guild.members.get("user ID here");
                            }
                            console.log('No Match for ids:\n' + notFoundIds);
                            var str = notFoundIds.toString().replace(/,/g, '\n');
                            message.channel.send('No Match for ids:\n' + str);
                        }
                        //Update Attendance sheet accoding to family names
                        updateAttendanceSheet(key, data, function (err, res) {
                            if (res.length != 0) {
                                console.log('No Match for family names:\n' + res);
                                var str2 = res.toString().replace(/,/g, '\n');
                                message.channel.send('No Match for family names:\n' + str2);
                            }
                        });
                    });
                }
            }
            else {
                console.log(new Date().toLocaleString() + ' Error: Non Devour Member');
            }
        }
        else if (message.channel.id === config.feedbackChannelID) {//feedback msg
            if (message.member.nickname) {//if user has a nickname
                const feedback = "<@" + message.author.id + "> " + message.member.nickname + " / " + message.author.username + ":\n" + message.toString();
                const resultChannel = client.channels.get(config.feedbackResultChannel);
                resultChannel.send(feedback);
                console.log(new Date().toLocaleString() + feedback);
                message.delete();
            } else {
                const feedback = "<@" + message.author.id + "> " + message.author.username + " :\n" + message.toString();
                const resultChannel = client.channels.get(config.feedbackResultChannel);
                resultChannel.send(feedback);
                console.log(new Date().toLocaleString() + feedback);
                message.delete();
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
        else if (message.content === '$ak') {
            message.channel.send('I am the patrigo of irl');
        }
        //STop the bot
        else if (message.content === '$stop') {
            if (message.member.roles.exists('name', config.modRole)) {
                client.destroy();
                process.exit();
            }
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
client.on('disconnect', () => {
    console.log(new Date().toLocaleString() + ' Disconnect');
    client.destroy();
    process.exit();
});
/*
    Upond a new user joining the server, send a greeting with info about guild
*/
client.on('guildMemberAdd', (member) => {
    console.log(new Date().toLocaleString() + ' New member :' + member.displayName);
    const infoChannel = client.channels.get('463177896639332353');
    const docsChannel = client.channels.get('392716965682216960');
    member.send('`Welcome to the <Devour> discord.`\n\n' +
        '- Black Desert Online guild\n\n' +
        'Please check out the ' + infoChannel + ' channel for rules / information regarding the guild, including requirements to become a member.\n\n' +
        '1) If you are applying to join the guild, please DM someone in the Leadership role on discord.We will ask you a series of questions and set you up to do a PvP Trial.\n\n' +
        '2) If you are a new member currently in the guild, please DM Leadership in order to get the correct role on discord, and look in our ' + docsChannel + 'channel for the gear survey and axe forms.These are required for new members to submit.\n\n' +
        '3) If none of the first two scenarios apply to you, and you\'re just here for the community, enjoy your stay and come chill with us on voice. 😊')
        .then(message => console.log('Sent greeting'))
        .catch(console.error);
});

client.login(config.token);

function uniq(a) {
    return Array.from(new Set(a));
}