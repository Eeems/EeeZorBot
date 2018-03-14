listen(rCommand("uptime"), function(match, data, replyTo, connection) {
  if (validUser(match[2], match[1]) && isOp(match[2])) {
    connection.reply(replyTo, "Uptime: " + process.uptime());
  }
});
listen(rCommand("exit"), function(match, data, replyTo, connection) {
  if (validUser(match[2], match[1]) && isOp(match[2])) {
    exit();
  }
});
listen(rCommand("quit"), function(match, data, replyTo, connection) {
  if (validUser(match[2], match[1]) && isOp(match[2])) {
    connection.quit();
  }
});
regHelp("uptime", "returns the current uptime of the bot");
regHelp("exit", "disconnects from all connections and exits the bot's process");
regHelp("quit", "disconnect from the current server");
regHelp("disable", "disables a script");
disp.alert("manager script finished");
