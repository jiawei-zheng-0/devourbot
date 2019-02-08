Discord Bot

Requires a config.json and a credentials.json file

config.json

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
`
