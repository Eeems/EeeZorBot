/**
 * stdin control
 * @module stdin
 * @class stdin
 * @static
 */
var fs = require('fs'),
	vm = require('vm'),
	api,
	commands = [],
	i,
	d,
	path,
	config = (function(){
		var c = require('../etc/config.json').stdin,
			d = {
				console: true,
				levels: {
					log: true,
					info: true,
					warn: true,
					error: true,
					trace: true,
					dir: true,
					debug: false
				},
				scripts: []
			},
			i,
			ii;
		for(i in d){
			if(c[i] === undefined){
				c[i] = d[i];
			}else if(typeof d[i] == 'object'){
				for(ii in d[i]){
					if(c[i][ii] === undefined){
						c[i][ii] = d[i][ii];
					}
				}
			}
		}
		return c;
	})(),
	stdin = {
		/**
		 * Start listening for user input
		 * @method start
		 * @chainable
		 */
		start: function(){
			if(config.console){
				process.stdin.resume();
				process.stdin.setEncoding('utf8');
			}
			return this;
		},
		/**
		 * Stop waiting for user input
		 * @method stop
		 * @chainable
		 */
		stop: function(){
			if(config.console){
				process.stdin.pause();
			}
			return this;
		},
		/**
		 * Register an event listener
		 * @method on
		 * @param {string} event Event name
		 * @param {function} callback Callback to run
		 * @chainable
		 */
		on: function(event,callback){
			process.stdin.on(event,function(){
				if(config.console){
					return callback.apply(this,arguments);
				}
			});
			return this;
		},
		/**
		 * Adds a command to the stdin
		 * @method add
		 * @param {string} name name for the command
		 * @param {function} callback callback to run when command is entered
		 * @param {string} [info] Command help line
		 * @chainable
		 */
		add: function(name,callback,info){
			if(config.console){
				stdin.console('info',' |  |- command '+name);
				commands.push({
					name: name,
					fn: callback,
					info: info === undefined?'':info
				});
			}
			return this;
		},
		/**
		 * Calls a console output method
		 * @method console
		 * @param {string} method The method to call
		 * @param {array} [args]* The arguments to pass
		 * @chainable
		 */
		console: function(method){
			if(config.levels[method] && global.console[method] !== undefined){
				if(global.console !== undefined){
					global.console[method].apply(global.console,[].slice.call(arguments,1));
				}
			}
			return this;
		},
		/**
		 * stdin config
		 * @type {object}
		 * @property config
		 */
		config: config
	};
module.exports = stdin;
process.stdin.on('data',function(d){
	if(config.console){
		var i,
			argv = (d+'').split(' ');
		for(i=0;i<argv.length;i++){
			argv[i] = argv[i].trim();
		}
		argv = argv.filter(function(n){
			return n;
		});
		for(i=0;i<commands.length;i++){
			if(argv[0] == commands[i].name){
				try{
					commands[i].fn(argv);
				}catch(e){
					stdin.console('error',e);
				}
			}
		}
	}
});
stdin.console('info','Loading stdin scripts');
stdin.console('info',' |- lib/stdin.js');
stdin.add('help',function(argv){
		var m='',
			i;
		if(argv.length == 1){
			for(i=0;i<commands.length;i++){
				m += commands[i].name+' ';
			}
			stdin.console('log','Available commands:');
			stdin.console('log',m);
		}else{
			for(i=0;i<commands.length;i++){
				if(commands[i].name === argv[1]){
					stdin.console('log',commands[i].name+': '+commands[i].info);
				}
			}
		}
	},'Lists all help topics, or lists information on a specific topic')
	.add('exit',function(){
		process.exit();
	},'Quits the bot')
	.add('debug',function(){
		stdin.stop();
		stdin.console('log','Starting debugger');
		var repl = require('repl').start({
				terminal: true,
				useColor: true,
				useGlobal: true
			}),
			i;
		repl.on('exit',function(){
			stdin.console('log','Debugger exiting');
			stdin.start();
		});
	},'Starts the debugger')
	.add('raw',function(argv){
		argv.shift();
		require('./api.js').servers[argv.shift()].send(argv.join(' '));
	},'Runs a command on a server.')
	.add('info',function(argv){
		var servers = require('./api.js').servers,
			i,
			ii,
			u,
			c,
			m,
			s,
			server = servers[argv[1]];
		if(server !== undefined){
			if(argv.length > 2){
				c = server.channel(argv[2]);
				u = server.user(argv[2]);
				if(c){
					stdin.console('log','Channel : '+argv[2]);
					if(c.topic === null){
						stdin.console('log','No topic set.');
					}else{
						stdin.console('log','Topic: '+c.topic);
					}
					stdin.console('log','Users:');
					for(i=0;i<c.users.length;i++){
						u = c.users[i];
						stdin.console('log','	'+u.nick+' ('+u.username+'@'+u.host+' '+u.realname+')');
					}
					if(c.modes.b instanceof Array){
						stdin.console('log','Bans:');
						for(i=0;i<c.modes.b.length;i++){
							stdin.console('log','	'+c.modes.b[i]);
						}
					}
					if(c.modes.e instanceof Array){
						stdin.console('log','Ban Exceptions:');
						for(i=0;i<c.modes.e.length;i++){
							stdin.console('log','	'+c.modes.e[i]);
						}
					}
					if(c.modes.I instanceof Array){
						stdin.console('log','Invitations:');
						for(i=0;i<c.modes.I.length;i++){
							stdin.console('log','	'+c.modes.I[i]);
						}
					}
				}else if(u){
					stdin.console('log','Nick: '+u.nick);
					stdin.console('log','Username: '+u.username);
					stdin.console('log','Real Name: '+u.realname);
					stdin.console('log','Host: '+u.host);
					stdin.console('log','Channels:');
					for(i=0;i<u.channels.length;i++){
						c = u.channels[i];
						stdin.console('log','	'+c.name);
						m = u.modes[c.name];
						if(m !== undefined && m.length > 0){
							s = '';
							for(ii=0;ii<m.length;ii++){
								s += ','+m[ii];
							}
							stdin.console('log','		Modes: '+s.substr(1));
						}
						if(c.topic !== null){
							stdin.console('log','		Topic: '+c.topic);
						}
					}
				}else{
					stdin.console('log','Invalid channel');
				}
			}else{
				stdin.console('log','Channels:');
				for(i=0;i<server.channels.length;i++){
					stdin.console('log','	'+server.channels[i].name);
				}
				stdin.console('log','Users:');
				for(i=0;i<server.users.length;i++){
					stdin.console('log','	'+server.users[i].nick);
				}
			}
		}else{
			stdin.console('log','Servers:');
			for(i=0;i<api.servers.length;i++){
				stdin.console('log','	'+i+') '+servers[i].config.nick+'@'+servers[i].config.host);
			}
		}
	},'Displays information on the servers/channels/users');
api = require('./api.js');
api.stdin = stdin;
for(i=0;i<config.scripts.length;i++){
	try{
		path = config.scripts[i];
		stdin.console('info',' |- '+path);
		d = fs.readFileSync(path);
		vm.runInNewContext(d,api,path);
	}catch(e){
		stdin.console('trace');
		stdin.console('error',e);
	}
}