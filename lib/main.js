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
					log.log('Channel : '+argv[2]);
					log.log('Users:');
					for(i=0;i<c.users().length;i++){
						u = c.users()[i];
						log.log('	'+u.nick+' ('+u.username+'@'+u.host+' '+u.realname+')');
					}
				}else{
					log.log('Invalid channel');
				}
			}else{
				log.log('Channels:');
				for(i=0;i<server.channels.length;i++){
					log.log('	'+server.channels[i].name);
				}
			}
		}else{
			log.log('Servers:');
			for(i=0;i<servers.length;i++){
				log.log('	'+i+') '+servers[i].config.nick+'@'+servers[i].config.host);
			}
		}
	},'Displays Channel info')
	.start();