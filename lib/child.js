var settings,
	server,
	Server = require('./server.js'),
	test = function(){
		server.send('PRIVMSG '+this.channel.name+' '+this.argv.join(' '));
	},
	handleClose = function(){
		this.destroy();
		if(api.servers.length === 0){
			log.debug('Killing bot');
			process.exit();
		}
	};
process.on('message',function(args,reference){
	switch(args.type){
		case 'server':
			if(server===undefined){
				server = new Server(args.config);
				server
					.add('test',test)
					.on('close',handleClose)
					.connect();
			}
		break;
	}
});
process.on('error',function(e){
	console.error('ERROR ON CHILD');
	console.error(e);
	console.trace();
});
process.on('exit',function(){
	if(server!==undefined){
		server.destroy();
	}
	console.log('CHILD EXITING');
});