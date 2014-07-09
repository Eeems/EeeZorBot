var commands = [],
	log = require('./log.js'),
	stdin = {
		start: function(){
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			return this;
		},
		stop: function(){
			process.stdin.pause();
			return this;
		},
		on: function(event,callback){
			process.stdin.on(event,callback);
			return this;
		},
		add: function(name,callback){
			commands.push({
				name: name,
				fn: callback
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
	for(i=0;i<commands.length;i++){
		if(argv[0] == commands[i].name){
			commands[i].fn(argv);
		}
	}
});
stdin.add('help',function(argv){
	var m='',i;
	for(i=0;i<commands.length;i++){
		m += commands[i].name+' ';
	}
	log.log('Available commands:');
	log.log(m);
});
stdin.add('exit',function(){
	process.exit();
});