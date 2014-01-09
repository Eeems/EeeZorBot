function hasVoice(nick,host){
	var user = getUser(nick);
	if(user.flags.voice && validUser(nick,host)){
		return true;
	}
	if(user.hosts.length == 0){
		return true;
	}
	return false;
}
listen(/^:([^!]+).*JOIN :([^ ]+)$/i,function(match,data,replyTo,connection){
	var user = match[1].trim();
	if(!hasVoice(user)){
		connection.send('MODE '+match[2].trim()+' +v '+user);
	}
});
listen(rCommand('voice-ignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	if(!hasVoice(user)){
		connection.reply(replyTo,"ignoring "+user);
		saveUser(user,{
			flags:{
				voice: false
			}
		});
	}else{
		connection.reply(replyTo,"already ignoring");
	}
});
listen(rCommand('voice-unignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	if(hasVoice(user)){
		connection.reply(replyTo,"automatically voicing "+user);
		saveUser(user,{
			flags: {
				voice: true
			}
		});
	}else{
		connection.reply(replyTo,"already voicing");
	}
});
hook('unload',function(){
	delete hasVoice;
});
regHelp('voice-ignore','Do not automatically voice this user');
regHelp('voice-unignore','automatically voice this user');