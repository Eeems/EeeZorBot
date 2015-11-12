var Server = require('./server.js'),
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
process.title = 'EeeZorBot';
process.on('SIGINT',function(){
	console.log('CTRL-C hit!');
	process.listeners('exit').forEach(function(fn){
		fn();
	});
	process.removeAllListeners('exit');
	process.exit();
});
for(i=0;i<servers.length;i++){
	try{
		server = new Server(servers[i]);
		server
			.add('test',test)
			.on('stop',handleStop)
			.connect();
	}catch(e){
		log.trace(e);
	}
}
stdin.start();
process.on('uncaughtException',function(e){
	log.trace(e);
}).on('exit',function(){
	log.info('Console stopped');
	stdin.stop();
});
if(global!==undefined){
	global.api = require('./api.js');
}