var settings = (function(){
		var s = require('../etc/config.json').logs.websocket,
			ss = require('../etc/config.json').logs.server;
		if(s.listeners === undefined){
			s.listeners = [];
		}
		s.api = {
			host: ss.host,
			port: ss.port
		};
		return s;
	})(),
	deasync = require('deasync'),
	http = require('http'),
	i,
	channels = {},
	request = http.request,
	handleConnect = function(c){
		console.log('Websocket connected');
		c.on('message',function(data){
			data = JSON.parse(data);
			switch(data.type){
				case 'sub':
					if(!channels[data.channel]){
						channels[data.channel] = [];
					}
					if(channels[data.channel].indexOf(c) == -1){
						channels[data.channel].push(c);
					}
				break;
				case 'get/line':
					request({
						host: settings.api.host,
						port: settings.api.port,
						path: '/api/get/line/'+data.id
					},function(res){
						var data = '';
						res.on('data',function(chunk){
							data += chunk;
						});
						res.on('end',function(){
							c.send(JSON.stringify({
								type: 'pub',
								payload: JSON.parse(data)
							}));
						});
					}).on('error',function(e){
						console.error(e);
					}).end();
				break;
			}
		});
		c.on('close',function(){
			console.log('Websocket disconnected');
			var channel,i;
			for(i in channels){
				channel = channels[i];
				if(channel.indexOf(c)!=-1){
					channel.splice(channel.indexOf(c),1);
				}
			}
		});
	},
	handlePub = function(data){
		if(channels[data.channel]){
			var json = JSON.stringify(data);
			channels[data.channel].forEach(function(c){
				c.send(json);
			});
		}
	},
	ws = new websocket.WebSocketServer({
		host: settings.host,
		port: settings.port
	});
ws.on('connection',handleConnect);
pubsub.sub('log',handlePub);
script.unload = function(){
	pubsub.unsub('log',handlePub);
	ws.destroy();
};