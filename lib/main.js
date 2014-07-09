var Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	config = require('../etc/config.json'),
	server = new Server({
		host: 'irc.omnimaga.org',
		nick: config.nick,
		name: config.name,
		username: config.username
	});
server.connect();
stdin.add('raw',function(argv){
	argv.shift();
	server.send(argv.join(' '));
}).start();