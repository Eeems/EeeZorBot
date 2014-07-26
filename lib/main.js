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
for(i=0;i<servers.length;i++){
	try{
		server = new Server(servers[i]);
		server
			.on('connect',connect)
			.off('connect',connect)
			.add('test',test)
			.connect();
	}catch(e){
		log.error(e);
	}
}
stdin.start();