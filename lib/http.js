var http = require('http'),
	servers = {},
	HttpServer = function(host,port){
		log.debug('Creating server '+host+':'+port);
		var self = this;
		self.host = host;
		self.port = port;
		self._handles = [];
		self.handle = function(callback){
			self._handles.push(callback);
		};
		self.on = function(){
			self.server.on.apply(self.server,arguments);
		};
		self.close = function(callback){
			self.server.close(callback);
			
		};
		self.server = http.createServer(function(req,res){
			log.debug(self.host+':'+self.port+' - '+req.method+' - '+req.url);
			var sandbox = {
					end: function(){}
				},
				i;
			for(i in self._handles){
				try{
					self._handles[i].call(self,req,res);
				}catch(e){}
			}
			res.end();
		}).listen(port,host);
		return self;
	};
module.exports = {
	getServer: function(host,port){
		if(servers[host+':'+port] === undefined){
			servers[host+':'+port] = new HttpServer(host,port);
		}
		return servers[host+':'+port];
	}
};