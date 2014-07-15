var Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js'),
	server = new Server(require('../etc/config.json')),
	connect = function(){
		console.log('connect');
	};
server
	.on('connect',connect)
	.off('connect',connect)
	.connect();
stdin
	.add('raw',function(argv){
		argv.shift();
		server.send(argv.join(' '));
	},'Runs a command on the main server.')
	.add('channel',function(argv){
		var l = function(name){
				var i,
					u,
					c = server.channel(name);
				log.log('Channel : '+name);
				log.log('Users:');
				for(i=0;i<c.users().length;i++){
					u = c.users()[i];
					log.log('	'+u.nick+' ('+u.username+'@'+u.host+' '+u.realname+')');
				}
			},
			i;
		if(argv.length > 1){
			l(argv[1]);
		}else{
			for(i=0;i<server.channels.length;i++){
				l(server.channels[i].name);
			}
		}
	},'Displays Channel info')
	.start();
global.server = server;