var users = listdb.getDB('users_ignored_for_voice');
listen(/^:([^!]+).*JOIN :([^ ]+)$/i,function(match,data,replyTo,connection){
	var user = match[1].trim();
	if(!users.hasValue(user)){
		connection.send('MODE '+match[2].trim()+' +v '+user);
	}
});
listen(rCommand('voice-ignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	if(!users.hasValue(user)){
		connection.reply(replyTo,"ignoring "+user);
		users.add(user);
	}else{
		connection.reply(replyTo,"already ignoring");
	}
});
listen(rCommand('voice-unignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	if(users.hasValue(user)){
		connection.reply(replyTo,"automatically voicing "+user);
		users.remove(user);
	}else{
		connection.reply(replyTo,"already voicing");
	}
});
regHelp('voice-ignore','Do not automatically voice this user');
regHelp('voice-unignore','automatically voice this user');