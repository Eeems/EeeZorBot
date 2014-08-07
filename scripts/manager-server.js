var api = require('../lib/api.js');
server.add('uptime',function(){
		server.send('PRIVMSG '+this.channel.name+' :'+process.uptime());
	},'Displays the current uptime of the bot')
	.add('exit',function(){
		process.exit();
	},'Makes the bot exit')
	.add('quit',function(){
		server.quit();
		log.log('quitting');
	},'Makes the bot quit from the current server')
	.on('join',function(){
		var owner = owners.match(this.user.hostmask);
		if(owner && owner.flags.indexOf('v')){
			this.channel.mode('+v',user);
		}
	});