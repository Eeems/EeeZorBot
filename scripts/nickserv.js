listen(/^:NickServ!NickServ@services.[^ ]+ NOTICE [^ ]+ :This nickname is registered/i,function(match,data,replyTo,connection){
	disp.log("Nickserv identification requested");
	if(connection.config.nickserv!=undefined){
		connection.reply("Nickserv","IDENTIFY "+connection.config.nickserv);
	}
	disp.alert("Nickserv listener used");
});
disp.alert("Nickserv listener started");