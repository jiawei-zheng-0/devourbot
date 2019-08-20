Discord Bot

python 2.7 must be installed

visual studio 2015 must be installed if running on windows

npm config set msvs_version 2015 --global

run npm install




Requires a config.json and a credentials.json file

config.json
```json
{
    "token": "<Discord bot token>",
    "room": "<Name of room to listen for commands>",
    "memberRole": "<Role of members that can use bot>",
    "sheetID": "<id of google sheet for SMH>",
    "totalRange": "<Range of the cell that contains weekly total>",
    "idCell": "<Cell to insert ID for individual total>",
    "individualTotalCell": "<Cell to retrieve individual total>",
    "summaryIDCell": "<Cell to insert ID for summary>",
    "summaryRange": "<Range of cells containing summary info>",
    "warChannelID": "<ID of war channel>",
    "attendanceSheetID": "<id of google sheet containing attendance>",
    "modRole": "<Role of members that can use attendance function>",
    "IDTable": "<Range of mapping of ID to name>",
    "attendanceRange": "<Range of cells containing attendance info>"
}
```
credentials.json is avaliable by creating a new GCP project and adding OAuth2 credentials
