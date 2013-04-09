listen(rCommand('uptime'),function(match,data,replyTo,connection){
	connection.reply(replyTo,"Uptime: "+process.uptime());
});
listen(rCommand('exit'),function(match,data,replyTo,connection){
	exit();
});
listen(rCommand('quit'),function(match,data,replyTo,connection){
	connection.quit();
});
regHelp('uptime','returns the current uptime of the bot');
regHelp('exit',"disconnects from all connections and exits the bot's process");
regHelp('quit','disconnect from the current server');
regHelp('disable','disables a script');
regHelp('reload','reloads all scripts');
disp.alert('manager script finished');