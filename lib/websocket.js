var WSServer = require('ws').Server,
	servers = [],
	WebSocketServer = function(host,port){
		log.debug('Creating socket server '+host+':'+port);
		var self = this;
		self.host = host;
		self.port = port;
		self._handles = [];
		self._sockets = [];
		Object.defineProperty(self,'id',{
			get: function(){
				return servers.indexOf(self);
			}
		});
		self.handle = function(callback){
			self._handles.push(callback);
			return self;
		};
		self.each = function(callback){
			self._sockets.forEach(function(c,i){
				if(c !== undefined){
					try{
						callback.call(self,c,i);
					}catch(e){
						console.log(e);
						console.trace();
					}
				}
			});
			return self;
		};
		self.write = function(data,encoding){
			var args = arguments;
			self.each(function(c,i){
				c.send.apply(c,args);
			});
			return self;
		};
		self.on = function(){
			self.server.on.apply(self.server,arguments);
			return self;
		};
		self.close = function(callback){
			log.debug('Closing server '+host+':'+port);
			try{
				self.server.removeAllListeners();
				self.server.close(callback);
			}catch(e){
				console.error(e);
			}
			servers.splice(self.id);
		};
		try{
			self.server = new WSServer({
				port: port,
				host: host
			});
			self.server.on('connection',function(c){
				self._sockets.push(c);
				c.on('data',function(data){
					var sandbox = {
							end: function(){}
						},
						i;
					for(i in self._handles){
						try{
							self._handles[i].call(self.server,data);
						}catch(e){}
					}
				});
				c.on('close',function(){
					if(self._sockets.indexOf(c)!=-1){
						self._sockets.splice(self._sockets.indexOf(c),1);
					}
				});
			});
		}catch(e){
			throw new Error('Failed to bind server to '+self.host+':'+self.port+' due to error: '+e);
		}
		return self;
	},
	mods = require('./tools.js').mods('http');
module.exports = {
	getServer: function(host,port){
		for(var i in servers){
			if(servers[i].host == host && servers[i].port == port){
				console.log('Found existing server '+host+':'+port);
				return servers[i];
			}
		}
		return servers[servers.push(new WebSocketServer(host,port))-1];
	},
	isRunning: function(host,port){
		for(var i in servers){
			if(servers[i].host == host && servers[i].port == port){
				return true;
			}
		}
		return false;
	},
	servers: servers,
	WebSocketServer: WebSocketServer
};
process.on('exit',function(){
	for(var i in servers){
		servers[i].close();
	}
});