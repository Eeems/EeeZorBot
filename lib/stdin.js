/**
 * stdin control
 * @module stdin
 * @class stdin
 * @static
 */
var commands = [],
	config = (function(){
		var c = require('../etc/config.json').stdin,
			d = {
				console: true,
				write: true
			},
			i;
		for(i in d){
			if(c[i] === undefined){
				c[i] = d[i];
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
			if(config.write){
				console[method].apply(console,[].slice.call(arguments,1));
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
			argv = d.split(' ');
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
},'Lists all help topics, or lists information on a specific topic');
stdin.add('exit',function(){
	process.exit();
},'Quits the bot');
stdin.add('debug',function(){
	stdin.stop();
	stdin.console('log','Starting debugger');
	require('repl').start({
		terminal: true,
		useColor: true,
		useGlobal: true
	}).on('exit',function(){
		stdin.console('log','Debugger exiting');
		stdin.start();
	});
},'Starts the debugger');