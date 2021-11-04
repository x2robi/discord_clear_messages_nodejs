const config = require("./config.js");
const ClearMessagesManager = require("./clearMessagesManager.js");
const manager = new ClearMessagesManager(config.token, config.authorId);

manager.start(process.argv[2]);