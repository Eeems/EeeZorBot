var Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js'),
	servers = require('../etc/config.json').servers,
	i,
	server,
	connect = function(){
		console.log('connect');
	},
	test = function(){
		server.send('PRIVMSG '+this.channel.name+' '+this.argv.join(' '));
	};
global.servers = [];
for(i=0;i<servers.length;i++){
	try{
		server = new Server(servers[i]);
		global.servers.push(
			server
				.on('connect',connect)
				.off('connect',connect)
				.add('test',test)
				.connect()
		);
	}catch(e){
		log.error(e);
	}
}
servers = global.servers;
stdin
	.add('raw',function(argv){
		argv.shift();
		servers[argv.shift()].send(argv.join(' '));
	},'Runs a command on a server.')
	.add('info',function(argv){
		var i,
			u,
			c,
			server = servers[argv[1]];
		if(server !== undefined){
			if(argv.length > 2){
				c = server.channel(argv[2]);
				if(c){
					console.log('Channel : '+argv[2]);
					if(c.topic === null){
						console.log('No topic set.');
					}else{
						console.log('Topic: '+c.topic);
					}
					console.log('Users:');
					for(i=0;i<c.users().length;i++){
						u = c.users()[i];
						console.log('	'+u.nick+' ('+u.username+'@'+u.host+' '+u.realname+')');
					}
					if(c.modes.b instanceof Array){
						console.log('Bans:');
						for(i=0;i<c.modes.b.length;i++){
							console.log('	'+c.modes.b[i]);
						}
					}
					if(c.modes.e instanceof Array){
						console.log('Ban Exceptions:');
						for(i=0;i<c.modes.e.length;i++){
							console.log('	'+c.modes.e[i]);
						}
					}
					if(c.modes.I instanceof Array){
						console.log('Invitations:');
						for(i=0;i<c.modes.I.length;i++){
							console.log('	'+c.modes.I[i]);
						}
					}
				}else{
					console.log('Invalid channel');
				}
			}else{
				console.log('Channels:');
				for(i=0;i<server.channels.length;i++){
					console.log('	'+server.channels[i].name);
				}
			}
		}else{
			console.log('Servers:');
			for(i=0;i<servers.length;i++){
				console.log('	'+i+') '+servers[i].config.nick+'@'+servers[i].config.host);
			}
		}
	},'Displays Channel info')
	.start();