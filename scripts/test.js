hook(
  "data",
  function(match, data, replyTo, connection) {
    disp.log("Test Command Recieved");
    connection.reply(replyTo, "Test Command Recieved");
  },
  {
    regex: new RegExp(config.prefix + "test", "i")
  }
);
listen(rCommand("timeout"), function(match, data, replyTo, connection) {
  connection.emit("timeout");
});
regHelp("timeout", "simulate a timeout.");
regHelp("test", "lets you know if scripts are currently working.");
disp.alert("test script finished");
