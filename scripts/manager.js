server.add('uptime',function(){
	server.send('PRIVMSG '+this.channel.name+' :'+process.uptime());
},'Displays the current uptime of the bot');
server.add('exit',function(){
	process.exit();
},'Makes the bot exit');
server.add('quit',function(){
	server.quit();
	log.log('quitting');
},'Makes the bot quit from the current server');