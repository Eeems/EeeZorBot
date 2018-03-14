listen(/^:([^!]+).*JOIN :([^ ]+)$/i, function(
  match,
  data,
  replyTo,
  connection
) {
  var user = match[1].trim();
  if (getUser(user).flags.voice) {
    connection.send("MODE " + match[2].trim() + " +v " + user);
  }
});
listen(rCommand("voice-ignore", true), function(
  match,
  data,
  replyTo,
  connection
) {
  if (validUser(match[2], match[1]) && isOp(match[2])) {
    var user = match[3].trim();
    connection.reply(replyTo, "ignoring " + user);
    saveUser(user, {
      flags: {
        voice: false
      }
    });
  }
});
listen(rCommand("voice-unignore", true), function(
  match,
  data,
  replyTo,
  connection
) {
  if (validUser(match[2], match[1]) && isOp(match[2])) {
    var user = match[3].trim();
    connection.reply(replyTo, "automatically voicing " + user);
    saveUser(user, {
      flags: {
        voice: true
      }
    });
  }
});
hook("unload", function() {
  hasVoice = null;
});
regHelp("voice-ignore", "Do not automatically voice this user");
regHelp("voice-unignore", "Automatically voice this user");
