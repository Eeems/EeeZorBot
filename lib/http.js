var tools = require('./tools.js'),
	deasync = require('deasync'),
	Prop = tools.Prop,
	http = require('http'),
	servers = [],
	HttpServer = function(id){
		id = id===undefined?+new Date:id;
		var self = this,
			server = http.createServer(),
			open = true;
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
			clients: new Prop({
				get: function(){
					return server.connections;
				}
			}),
			close: function(callback){
				open = false;
				self.off();
				server.close(callback);
				console.log('HTTP Server Close queued');
				return self;
			},
			listen: function(){
				server.listen.apply(server,arguments);
				return self;
			},
			on: function(){
				server.on.apply(server,arguments);
				return self;
			},
			off: function(){
				if(arguments.length == 2){
					server.removeListener.apply(server,arguments);
				}else{
					server.removeAllListeners.apply(server,arguments);
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
		server.once('close',function(){
			if(open){
				self.close();
			}
		});
		return self;
	};
tools.extend(module.exports,{
	servers: new Prop({
		get: function(){
			return servers;
		}
	}),
	HttpServer: new Prop({
		readonly: true,
		enumerable: true,
		value: HttpServer
	})
});
process.on('exit',function(){
	servers.forEach(function(s){
		s.destroy();
	});
});