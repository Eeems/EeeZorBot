var commands = [],
	log = require('./log.js'),
	stdin = {
		/**
		 * Description
		 * @method start
		 * @return ThisExpression
		 */
		start: function(){
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			return this;
		},
		/**
		 * Description
		 * @method stop
		 * @return ThisExpression
		 */
		stop: function(){
			process.stdin.pause();
			return this;
		},
		/**
		 * Description
		 * @method on
		 * @param {} event
		 * @param {} callback
		 * @return ThisExpression
		 */
		on: function(event,callback){
			process.stdin.on(event,callback);
			return this;
		},
		/**
		 * Description
		 * @method add
		 * @param {} name
		 * @param {} callback
		 * @param {} info
		 * @return ThisExpression
		 */
		add: function(name,callback,info){
			commands.push({
				name: name,
				fn: callback,
				info: info === undefined?'':info
			});
			return this;
		}
	};
module.exports = stdin;
process.stdin.on('data',function(d){
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
				log.error(e);
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
		log.log('Available commands:');
		log.log(m);
	}else{
		for(i=0;i<commands.length;i++){
			if(commands[i].name === argv[1]){
				log.log(commands[i].name+': '+commands[i].info);
			}
		}
	}
},'Lists all help topics, or lists information on a specific topic');
stdin.add('exit',function(){
	process.exit();
},'Quits the bot');
stdin.add('debug',function(){
	stdin.stop();
	log.log('Starting debugger');
	require('repl').start({
		terminal: true,
		useColor: true,
		useGlobal: true
	}).on('exit',function(){
		log.log('Debugger exiting');
		stdin.start();
	});
},'Starts the debugger');