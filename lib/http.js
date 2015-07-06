var http = require('http'),
	servers = [],
	HttpServer = function(host,port){
		log.debug('Creating http server '+host+':'+port);
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
		self.hold = function(script){
			if(self._holds.indexOf(script) == -1){
				self._holds.push(script);
			}
			return self;
		};
		self.release = function(script){
			if(self._holds.indexOf(script) != -1){
				log.debug('Releasing hold on server '+self.host+':'+self.port+' for script '+script.suid);
				self._holds.splice(self._holds.indexOf(script),1);
			}
			for(var i in self._holds){
				if(self._holds[i].enabled === false){
					self.release(self._holds[i]);
				}
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
		};
		try{
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
	servers: servers,
	HttpServer: HttpServer
};
process.on('exit',function(){
	for(var i in servers){
		servers[i].close();
	}
});