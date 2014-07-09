var Server = require('./server.js'),
	log = require('./log.js'),
	stdin = require('./stdin'),
	config = require('../etc/config.json'),
	server = new Server({
		host: 'localhost',
		nick: config.nick,
		name: config.name,
		username: config.username
	});
server.connect();