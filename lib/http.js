var http = require('http'),
	servers = [],
	HttpServer = function(host,port){
		log.debug('Creating server '+host+':'+port);
		var self = this;
		self.host = host;
		self.port = port;
		self._handles = [];
		self._holds = [];
		Object.defineProperty(self,'id',{
			get: function(){
				return servers.indexOf(self);
			}
		});
		self.handle = function(callback){
			self._handles.push(callback);
			return self;
		};
		self.hold = function(suid){
			if(self._holds.indexOf(suid) == -1){
				self._holds.push(suid);
			}
			return self;
		};
		self.release = function(suid){
			if(self._holds.indexOf(suid) != -1){
				log.debug('Releasing hold on server '+self.host+':'+self.port+' for script '+suid);
				self._holds.splice(self._holds.indexOf(suid),1);
			}
			if(self._holds.length === 0){
				self.close();
			}
			return self;
		};
		self.on = function(){
			self.server.on.apply(self.server,arguments);
			return self;
		};
		self.close = function(callback){
			log.debug('Closing server '+host+':'+port);
			try{
				self.server.close(callback);
			}catch(e){}
			servers.splice(self.id);
			// for(var i in self){
			//	delete self[i];
			// }
		};
		self.server = http.createServer(function(req,res){
			log.debug(self.host+':'+self.port+' - '+req.method+' - '+req.url);
			var sandbox = {
					end: function(){}
				},
				i;
			for(i in self._handles){
				try{
					self._handles[i].call(self.server,req,res);
				}catch(e){}
			}
		}).listen(port,host);
		return self;
	};
module.exports = {
	getServer: function(host,port){
		for(var i in servers){
			if(servers[i].host == host && servers[i].port == port){
				return servers[i];
			}
		}
		return servers[servers.push(new HttpServer(host,port))-1];
	},
	isRunning: function(host,port){
		for(var i in servers){
			if(servers[i].host == host && servers[i].port == port){
				return true;
			}
		}
		return false;
	},
	servers: servers
};