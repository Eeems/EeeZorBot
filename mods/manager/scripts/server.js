server.add('uptime',function(){
		this.channel.send(process.uptime());
	},'Displays the current uptime of the bot')
	.add('exit',function(){
		if(this.user && this.user.owner){
			process.exit();
		}else{
			this.user.send('Not Permitted');
		}
	},'Makes the bot exit')
	.add('quit',function(){
		if(this.user && this.user.owner){
			server.quit();
			log.log('quitting');
		}else{
			this.user.send('Not Permitted');
		}
	},'Makes the bot quit from the current server')
	.add('+ban',function(argv){
		if(this.user && this.user.owner && this.user.owner.flags.indexOf('b')){
			bans.add(argv);
			this.channel.send('Ban added');
		}else{
			this.user.send('Not Permitted');
		}
	})
	.add('-ban',function(argv){
		if(this.user && this.user.owner && this.user.owner.flags.indexOf('b')){
			bans.remove(argv);
			this.channel.send('Ban removed');
		}else{
			this.user.send('Not Permitted');
		}
	})
	.add('bans',function(argv){
		var t = this;
		if(t.user && t.user.owner && t.user.owner.flags.indexOf('b')){
			if(bans.length){
				t.user.send('Bans:');
				bans.each(function(ban){
					t.user.send(' - '+ban.hostmask);
				});
			}else{
				t.user.send('No bans.');
			}
		}else{
			t.user.send('Not Permitted');
		}
	});