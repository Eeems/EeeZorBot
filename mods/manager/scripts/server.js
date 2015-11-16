server.add('uptime',function(){
		this.channel.send(process.uptime());
	},'Displays the current uptime of the bot')
	.add('exit',function(){
		if(this.user && this.user.owner){
			process.exit();
		}
	},'Makes the bot exit')
	.add('quit',function(){
		if(this.user && this.user.owner){
			server.quit();
			log.log('quitting');
		}
	},'Makes the bot quit from the current server');