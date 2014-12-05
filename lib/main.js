var api = require('./api.js'),
	Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js'),
	servers = require('../etc/config.json').servers,
	i,
	server,
	test = function(){
		server.send('PRIVMSG '+this.channel.name+' '+this.argv.join(' '));
	},
	handleClose = function(){
		this.destroy();
		if(api.servers.length === 0){
			log.debug('Killing bot');
			process.exit();
		}
	};
for(i=0;i<servers.length;i++){
	try{
		server = new Server(servers[i]);
		server
			.add('test',test)
			.on('close',handleClose)
			.connect();
	}catch(e){
		console.log(api.log);
		log.error(e);
	}
}
stdin.start();
global.api = api;