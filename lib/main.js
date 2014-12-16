var api = require('./api.js'),
	Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js'),
	servers = require('../etc/config.json').servers,
	fork = require('child_process').fork,
	i,
	forks = [];
process.on('SIGINT',function(){
	process.exit();
});
process.on('exit',function(){
	for(var i in forks){
		forks[i].kill();
	}
});
for(i=0;i<servers.length;i++){
	try{
		var child = fork('./lib/child.js');
		forks.push(child);
		child.send({
			type: 'server',
			config: servers[i]
		});
		child.on('message',function(json,reference){
			switch(json.type){
				case 'server':
					api.servers.push(json.server);
				break;
			}
		});
		child.on('end',function(){
			forks.splice(forks.indexOf(child),i);
		});
	}catch(e){
		console.log(api.log);
		log.error(e);
	}
}
stdin.start();
if(global!==undefined){
	global.api = api;
}