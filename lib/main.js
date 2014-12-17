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
	handleStop = function(){
		var self = this;
		setTimeout(function(){
			self.connect();
		},5*60*1000);	// 5 minutes
	};
for(i=0;i<servers.length;i++){
	try{
		server = new Server(servers[i]);
		server
			.add('test',test)
			.on('stop',handleStop)
			.connect();
	}catch(e){
		console.log(api.log);
		log.error(e);
	}
}
stdin.start();
if(global!==undefined){
	global.api = api;
}
process.on('SIGINT',function(){
	process.exit();
});
process.on('exit',function(){
	stdin.stop();
});