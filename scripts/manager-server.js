server.add('uptime',function(){
		this.channel.send(process.uptime());
	},'Displays the current uptime of the bot')
	.add('exit',function(){
		process.exit();
	},'Makes the bot exit')
	.add('quit',function(){
		server.quit();
		log.log('quitting');
	},'Makes the bot quit from the current server')
	.on('join',function(){
		var f = function(flag,mode){
				if(this.user.owner.flags.indexOf(flag) != -1){
					this.channel.mode(mode,this.user);
				}
			};
		f('v','+v');
		f('h','+h');
		f('o','+o');
		f('a','+a');
		f('q','+q');
		f('b','+b');
	});