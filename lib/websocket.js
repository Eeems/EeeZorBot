var tools = require('./tools.js'),
	http = require('http'),
	deasync = require('deasync'),
	Prop = tools.Prop,
	WSServer = require('ws').Server,
	servers = [],
	WebSocketServer = function(config,server){
		id = +new Date;
		if(server === undefined){
			server = http.createServer();
		}else if(server instanceof require('./http.js').HttpServer){
			server = server.server;
		}
		if(config === undefined){
			server.listen(0);
		}else{
			server.listen(config);
		}
		var self = this,
			ws = new WSServer({
				server: server
			});
		tools.extend(self,{
			id: new Prop({
				readonly: true,
				enumerable: true,
				value: id
			}),
			server: new Prop({
				get: function(){
					return server;
				}
			}),
			port: new Prop({
				get: function(){
					return server.address().port;
				}
			}),
			host: new Prop({
				get: function(){
					return server.address().address;
				}
			}),
			ws: new Prop({
				get: function(){
					return ws;
				}
			}),
			close: function(callback){
				self.off();
				ws.close();
				process.nextTick(function(){
					callback();
				});
				console.log('Websocket Server Close queued');
				return self;
			},
			listen: function(){
				server.listen.apply(server,arguments);
				return self;
			},
			on: function(){
				ws.on.apply(ws,arguments);
				return self;
			},
			off: function(){
				if(arguments.length == 2){
					ws.removeListener.apply(ws,arguments);
				}else{
					ws.removeAllListeners.apply(ws,arguments);
				}
				return self;
			},
			each: function(fn){
				self.forEach(function(c,i){
					try{
						fn.apply(c,[c,i]);
					}catch(e){
						console.trace(e);
					}
				});
				return self;
			},
			send: function(data){
				self.each(function(c){
					c.send(data);
				});
				return self;
			},
			destroy: function(){
				try{
					self.close(function(){
						servers.splice(servers.indexOf(self),1);
					});
				}catch(e){
					console.trace(e);
				}
				while(servers.indexOf(self)!=-1){
					deasync.sleep(1);
				}
			}
		});
		servers.push(self);
		return self;
	};
tools.extend(module.exports,{
	servers: new Prop({
		get: function(){
			return servers;
		}
	}),
	WebSocketServer: new Prop({
		readonly: true,
		enumerable: true,
		value: WebSocketServer
	})
});
process.on('exit',function(){
	servers.forEach(function(s){
		s.destroy();
	});
});