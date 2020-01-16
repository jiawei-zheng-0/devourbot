const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const util = require('util');
const log_file = fs.createWriteStream(__dirname + '/debug.log', { flags: 'a' });
const log_stdout = process.stdout;
var broadcast;

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

console.log = function (d) { //Log to file and console
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
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.installed;
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
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
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

var sheetName; //Sheet name stores the name of the first sheet in attendance spreadsheet
/*
    Adds a new column to attendance spreadsheet
*/
function addNewColumn(auth, callback) {
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
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
        const batchUpdateRequest = {
            requests
        };
        sheets.spreadsheets.batchUpdate({
            spreadsheetId: config.attendanceSheetID,
            resource: batchUpdateRequest
        }, (err) => {
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
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
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
                        if (c === rows.length - 1) { //If reached end of list without matching ID, id is not on id table
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
//if member is a mod
function isRole(member, roleName) {
    return member.roles.find(role => role.name === roleName);
}

/*
    Takes a list of family names and updates attendace spreadsheet by adding a new column with y/n
*/
function updateAttendanceSheet(auth, nameList, callback) {
    const sheets = google.sheets({
        version: 'v4',
        auth
    });
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
                } else {
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
            }, () => {
                callback(null, nameList);
            });

        } else {
            console.log('No data found.');
        }
    });
}

var attendance; //boolean, true if attendance is being taken, false if otherwise
var attendanceSheet; //array of IDs of users whose attendance will be taken of

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
    //If message was recieved in a text channel (as oppsed to dms)
    if (message.channel.type === 'text') {
        //console.log('Message Recieved: ' + message.author.username + ': ' + message.content);
        //Checks if the message matches any commands
        if (message.content === '$commands') {
            var reply = '\nCommands:\nLeadership exclusive Exclusive:\n$startattendance - Start attendance in main room' +
                '\n$endattendance - end attendance and take attendance' +
                '\n$optionalloss - end attendance and do NOT take attendance' +
                '\n$commands - View list of commands for the bot' +
                '\n$yeslist - List of members that put yes for optional' +
                '\n$nolist - list of member that put no for optional' +
                '\n$noresponse - list of member that did not react to sign up bot' +
                '\n$join - join the current voice channel the user is in' +
                '\n$leave - leave voice channel' +
                '\n$play youtubeurl - plays the youtube to the voice channel the user is currently in' +
                '\n$pause - pause playing' +
                '\n$resume - resume playing' +
                '\n$stop - stop playing';
            message.reply(reply);
        }
        //Start taking attendance
        else if (message.content === '$startattendance') {
            //Role Check
            //console.log(message.member.roles.toJSON());
            if (isRole(message.member, config.modRole)) {
                //Check whether attendance is currently beign taken
                if (attendance == true) {
                    console.log('Attendence already being taken');
                    message.channel.send('Attendence already being taken');
                } else {
                    attendance = true;
                    console.log(new Date().toLocaleString() + ' Attendance Started');
                    message.channel.send('Attendance Started');

                    const warChannel = client.channels.get(config.warChannelID);
                    //Pushes all member currently in main war room when command is entered onto the attendance sheet
                    warChannel.members.forEach(function (guildMember, guildMemberId) {
                        attendanceSheet.push(guildMemberId);
                    });
                }
            } else {
                message.channel.send('Mod only command');
                console.log(new Date().toLocaleString() + 'Mod only command');
            }
        }
        //Stop taking attendance and update the attendance sheet
        else if (message.content === '$endattendance') {
            message.channel.startTyping();
            if (isRole(message.member, config.modRole)) {
                if (attendance == false) {
                    console.log('Attendence not being taken');
                    message.channel.send('Attendence not being taken');
                } else {
                    attendance = false;
                    console.log(new Date().toLocaleString() + ' Attendance stopped');
                    message.channel.send('Attendance stopped and recorded');
                    //Adds a new Column to attendance sheet
                    addNewColumn(key, function () {
                        //Removes duplicate ids on attendance sheet
                        var uniqueAttendanceSheet = uniq(attendanceSheet);
                        //Converts Ids to their respective family names
                        idToFamilyNames(key, uniqueAttendanceSheet, function (err, data, notFoundIds) {
                            console.log(new Date().toLocaleString() + ' Attendance :\n' + data);
                            //Clears attendanceSheet
                            attendanceSheet = [];
                            var familyNames = data.sort().toString().replace(/,/g, '\n');
                            message.channel.send('Attendance for tonight:\nTotal attendance: ' + data.length + '\n' + familyNames);
                            if (notFoundIds.length != 0) {
                                // Display not found ids to channel
                                for (var c = 0; c < notFoundIds.length; c++) {
                                    notFoundIds[c] = (notFoundIds[c] + ' : ' + client.users.get(notFoundIds[c]).username); //message.guild.members.get("user ID here");
                                }
                                console.log('No Match for ids:\n' + notFoundIds);
                                var notFoundIdsTxt = notFoundIds.toString().replace(/,/g, '\n');
                                message.channel.send('No Match for ids:\n' + notFoundIdsTxt);
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
                    });
                }
                message.channel.stopTyping();
            } else {
                message.channel.send('Mod only command');
                console.log(new Date().toLocaleString() + 'Mod only command');
            }
        } else if (message.content === '$optionalloss') {
            if (isRole(message.member, config.modRole)) {
                if (attendance == false) {
                    console.log('Attendence not being taken');
                    message.channel.send('Attendence not being taken');
                } else {
                    attendance = false;
                    console.log(new Date().toLocaleString() + ' Attendance stopped');
                    message.channel.send('Attendance stopped and not recorded');
                }
            } else {
                message.channel.send('Mod only command');
                console.log(new Date().toLocaleString() + 'Mod only command');
            }
        } else if (message.channel.id === config.feedbackChannelID) { //feedback msg
            let feedback;
            if (message.member.nickname) { //if user has a nickname
                feedback = '<@' + message.author.id + '> ' + message.member.nickname + ' / ' + message.author.username + ':\n' + message.toString();
            } else { //else ur username
                feedback = '<@' + message.author.id + '> ' + message.author.username + ' :\n' + message.toString();
            }
            const resultChannel = client.channels.get(config.feedbackResultChannel);
            resultChannel.send(feedback);
            console.log(new Date().toLocaleString() + feedback);
            message.delete();
        } else if (message.content.includes('loli')) {
            const poggersEmoji = client.emojis.get('443185247107153930');
            message.channel.send(`L O L I S ${poggersEmoji}`);
        } else if (message.content.includes('FBI')) {
            const monkaCopEmoji = client.emojis.get('421812771219570689');
            message.channel.send(`WEE WOO WEE WOO ${monkaCopEmoji}`);
        } else if (message.content.match(/\brin\b/g)) {
            const peepogunEmoji = client.emojis.get('421812739967680523');
            message.channel.send(`${peepogunEmoji}`);
        } else if (message.isMentioned('534802636822675468')) {
            const peepostreakEmoji = client.emojis.get('450463089775738880');
            message.channel.send(`${peepostreakEmoji}`);
        } else if (message.content === '$ak') {
            message.channel.send('I am the patrigo of irl');
        } else if (message.content === '$join' && message.member.voiceChannel != null) {
            if (message.member.voiceChannel) {
                message.member.voiceChannel.join()
                    .then(connection => { // Connection is an instance of VoiceConnection

                    })
                    .catch(console.log);
            }
        } else if (message.content.startsWith('$play') && client.voiceConnections != null ) {
            let url = message.content.slice(5);

            if (url && message.member.voiceChannel) {
                console.log(`playing ${url}`);
                message.member.voiceChannel.join()
                    .then(connection => { // Connection is an instance of VoiceConnection
                        broadcast = connection;
                        const ytdl = require('ytdl-core');
                        const streamOptions = { seek: 0, volume: 1 };
                        const stream = ytdl(url, { filter: 'audioonly' });
                        const dispatcher = connection.playStream(stream, streamOptions);
                        broadcast = dispatcher;
                    })
                    .catch(console.error);
            }
        }
        else if (message.content === '$stop' && client.voiceConnections != null) {
            broadcast.end();
        } else if (message.content === '$pause' && client.voiceConnections != null) {
            broadcast.pause();
        } else if (message.content === '$resume' && client.voiceConnections != null) {
            broadcast.resume();
        } else if (message.content === '$leave' && client.voiceConnections != null) {
            if (broadcast)
                broadcast.end();
            message.member.voiceChannel.leave();
        } else if (message.content === '$yeslist') {
            message.channel.startTyping();
            const members = message.guild.members;
            const yesList = [];
            members.forEach(member => {
                if ((isRole(member, config.memberRole) || isRole(member, config.premiumRole) || isRole(member, config.guildMasterRole)) && isRole(member, config.yesRole)) {
                    yesList.push(member.id);
                }
            });
            idToFamilyNames(key, yesList, (err, data, notFoundIds) => {
                const familyNames = data.sort().toString().replace(/,/g, '\n');
                message.channel.send('Yes List:\nTotal Yes: ' + data.length + '\n' + familyNames);
                if (notFoundIds.length != 0) {
                    for (var c = 0; c < notFoundIds.length; c++) {
                        notFoundIds[c] = (notFoundIds[c] + ' : ' + client.users.get(notFoundIds[c]).username);
                    }
                    console.log('No Match for ids:\n' + notFoundIds);
                    var notFoundIdsTxt = notFoundIds.toString().replace(/,/g, '\n');
                    message.channel.send('No Match for ids:\n' + notFoundIdsTxt);
                }
            });
            message.channel.stopTyping();
        } else if (message.content === '$nolist') {
            message.channel.startTyping();
            const members = message.guild.members;
            const noList = [];
            members.forEach(member => {
                if ((isRole(member, config.memberRole) || isRole(member, config.premiumRole) || isRole(member, config.guildMasterRole)) && isRole(member, config.noRole)) {
                    noList.push(member.id);
                }
            });
            idToFamilyNames(key, noList, (err, data, notFoundIds) => {
                const familyNames = data.sort().toString().replace(/,/g, '\n');
                message.channel.send('No List:\nTotal No: ' + data.length + '\n' + familyNames);
                if (notFoundIds.length != 0) {
                    for (var c = 0; c < notFoundIds.length; c++) {
                        notFoundIds[c] = (notFoundIds[c] + ' : ' + client.users.get(notFoundIds[c]).username);
                    }
                    console.log('No Match for ids:\n' + notFoundIds);
                    var notFoundIdsTxt = notFoundIds.toString().replace(/,/g, '\n');
                    message.channel.send('No Match for ids:\n' + notFoundIdsTxt);
                }
            });
            message.channel.stopTyping();
        } else if (message.content === '$noresponse') {
            message.channel.startTyping();
            const members = message.guild.members;
            const noResponseList = [];
            members.forEach(member => {
                if ((isRole(member, config.memberRole) || isRole(member, config.premiumRole) || isRole(member, config.guildMasterRole))
                    && (!isRole(member, config.noRole) && !isRole(member, config.yesRole))) {
                    noResponseList.push(member.id);
                }
            });
            idToFamilyNames(key, noResponseList, (err, data, notFoundIds) => {
                const familyNames = data.sort().toString().replace(/,/g, '\n');
                message.channel.send('No response List:\nTotal no responses: ' + data.length + '\n' + familyNames);
                if (notFoundIds.length != 0) {
                    for (var c = 0; c < notFoundIds.length; c++) {
                        notFoundIds[c] = (notFoundIds[c] + ' : ' + client.users.get(notFoundIds[c]).username);
                    }
                    console.log('No Match for ids:\n' + notFoundIds);
                    var notFoundIdsTxt = notFoundIds.toString().replace(/,/g, '\n');
                    message.channel.send('No Match for ids:\n' + notFoundIdsTxt);
                }
            });
            message.channel.stopTyping();
        }
        //STop the bot
        else if (message.content === '$stop') {
            if (isRole(message.member), config.modRole) {
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
    //console.log("Room change");
    if (attendance == true) {
        const newUserChannel = newMember.voiceChannel;
        //console.log(`new room = ${newUserChannel.id}`);
        //const oldUserChannel = oldMember.voiceChannel;
        //console.log(oldMember + newMember);
        if (newUserChannel != undefined && newUserChannel.id === config.warChannelID) { //user joins mains channel
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
        .then(() => console.log('Sent greeting'))
        .catch(console.error);
});

client.login(config.token);

function uniq(a) {
    return Array.from(new Set(a));
}