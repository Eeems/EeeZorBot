listen(/^:([^!]+).*JOIN :([^ ]+)$/i,function(match,data,replyTo,connection){
	var user = match[1].trim();
	if(getUser(user).flags.voice){
		connection.send('MODE '+match[2].trim()+' +v '+user);
	}
});
listen(rCommand('voice-ignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	connection.reply(replyTo,"ignoring "+user);
	saveUser(user,{
		flags:{
			voice: false
		}
	});
});
listen(rCommand('voice-unignore',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	connection.reply(replyTo,"automatically voicing "+user);
	saveUser(user,{
		flags: {
			voice: true
		}
	});
});
listen(rCommand('voice-status',true),function(match,data,replyTo,connection){
	var user = match[2].trim();
	connection.reply(replyTo,"Status of user "+user+" is: "+(getUser(user).flags.voice?'voiced':'mute'));
});
hook('unload',function(){
	delete hasVoice;
});
regHelp('voice-ignore','Do not automatically voice this user');
regHelp('voice-unignore','Automatically voice this user');
regHelp('voice-status','Displays the status of the user');