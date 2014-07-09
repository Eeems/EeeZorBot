var Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	server = new Server(require('../etc/config.json'));
server.connect();
stdin.add('raw',function(argv){
	argv.shift();
	server.send(argv.join(' '));
},'Runs a command on the main server.').start();