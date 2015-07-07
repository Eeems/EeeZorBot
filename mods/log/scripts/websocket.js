var settings = (function(){
		var s = require('../etc/config.json').logs.websocket;
		if(s.listeners === undefined){
			s.listeners = [];
		}
		return s;
	})(),
	i,
	servers = [],
	handleConnect = function(c){
		console.log('Websocket connection');
	},
	handleData = function(data){
		data = JSON.parse(data);
		console.log(data);
	},
	handlePub = function(data){
		servers.forEach(function(s){
			s.write(JSON.stringify(data));
		});
	};
if(settings.host!==undefined&&settings.port!==undefined){
	settings.listeners.push({
		host: settings.host,
		port: settings.port
	});
}
for(i in settings.listeners){
	try{
		var l = settings.listeners[i],
			s = websocket.getServer(l.host,l.port)
				.hold(script)
				.on('connection',handleConnect)
				.handle(handleData);
		servers.push(s);
	}catch(e){
		log.trace(e);
	}
}
pubsub.sub('log',handlePub);
script.unload = function(){
	servers.forEach(function(){
		s.close();
	});
	servers = [];
	pubsub.unsub('log',handlePub);
};