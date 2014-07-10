var Channel = require('./channel.js'),
	User = require('./user.js'),
	net = require('net'),
	tools = require('./tools.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js');
process.on('SIGINT',function(){
	stdin.stop();
	process.exit();
});
module.exports = function(config){
	var self = this,
		defaults = {
			host: '',
			port: 6667,
			nick: '',
			username: '',
			name: '',
			nickserv: undefined,
			channels: []
		},
		i,
		ii;
	for(i in defaults){
		if(config[i] === undefined){
			config[i] = defaults[i];
		}
	}
	self.channels = [];
	self.users = [];
	self.hooks = [];
	self.help = new require('./help.js')();
	self.config = {};
	self.buffer = {
		b: new Buffer(4096),
		size: 0
	};
	for(i in config){
		switch(i){
			case 'channels':break;
			default:
				self.config[i] = config[i];
		}
	}
	self.log = function(msg){
		log.alert('['+self.config.host+':'+self.config.port+'] '+msg);
		return this;
	};
	self.logIn = function(msg){
		log.in('['+self.config.host+':'+self.config.port+'] '+msg);
		return this;
	};
	self.logOut = function(msg){
		log.out('['+self.config.host+':'+self.config.port+'] '+msg);
		return this;
	};
	self.logError = function(msg){
		log.error('['+self.config.host+':'+self.config.port+'] '+msg);
		return this;
	};
	self.connect = function(){
		if(self.socket === undefined){
			log.log('Connecting to '+self.config.host+':'+self.config.port);
			self.socket = new net.Socket();
			self.socket.setNoDelay(true);
			self.socket.setEncoding('ascii');
			self.socket.on('connect',function(){
				self.log('Connection established (evt)');
				// connection established
			});
			self.socket.on('data',function(d){
				var s = d.split("\r\n"),
					i,
					ii,
					match,
					hook;
				for(ii=0;ii<s.length;ii++){
					self.logIn(s[ii]);
					for(i=0;i<self.hooks.length;i++){
						hook = self.hooks[i];
						match = hook.regex.exec(s[ii]);
						if(match){
							hook.fn.call(self,match,s[ii]);
							if(hook.once){
								self.hooks.splice(i,1);
							}
						}
					}
				}
				// TODO - incoming data
			});
			self.socket.on('drain',function(){
				// TODO - No more outgoing data
			});
			self.socket.on('error',function(e){
				self.log('Connection errored');
				self.logError(e);
			});
			self.socket.on('timeout',function(){
				self.log('Connection timed out');
				self.reconnect();
			});
			self.socket.on('end',function(){
				self.log('Connection ended');
				// TODO - server closed connection
			});
			self.socket.on('close',function(e){
				if(e){
					self.log('Connection closed due to an error');
					// TODO - socket was closed due to error
				}else{
					self.log('Connection closed');
					// TODO - socket closure was intended
				}
			});
			self.socket.connect(self.config.port,self.config.host,function(){
				self.log('Connection established');
				self.send('NICK '+self.config.nick);
				self.send('USER '+self.config.name+' localhost * '+self.config.name);
				// TODO - Handle connection
			});
		}
		return this;
	};
	self.send = function(d){
		if(d.length > 510){
			// TODO - too large
		}
		try{
			self.logOut(d);
			self.socket.write(d+'\r\n','ascii',function(){
				// TODO - data sent
			});
		}catch(e){
			// TODO - data failed to send
		}
		return this;
	};
	self.on = function(regex,callback,once){
		once = once===undefined?false:once;
		self.hooks.push({
			regex: regex,
			fn: callback,
			once: once
		});
		return this;
	};
	self.join = function(name){
		self.send('JOIN '+name);
		// TODO - handle adding to channel array if it doesn't already exist
		var channel = self.channel(name);
		if(!channel){
			channel = new Channel(self,name);
			self.channels.push(channel);
		}
		//channel.who();
		return this;
	};
	self.in = function(name){
		for(var i=0;i<self.channels.length;i++){
			if(self.channels[i].name == name){
				return true;
			}
		}
		return false;
	};
	self.channel = function(name){
		for(var i=0;i<self.channels.length;i++){
			if(self.channels[i].name == name){
				return self.channels[i];
			}
		}
		return false;
	};
	self.user = function(user){
		var i,
			old;
		if(user instanceof User){
			for(i-0;i<self.users.length;i++){
				if(self.users[i].nick === nick){
					old = self.users[i];
				}
			}
			if(old !== undefined){
				for(i in user){
					old[i] = user[i];
				}
			}else{
				old = user;
				self.users.push(user);
			}
		}else{
			for(i-0;i<self.users.length;i++){
				if(self.users[i].nick === user){
					old = self.users[i];
				}
			}
			old = old===undefined?false:old;
		}
		return old;
	};
	self.reconnect = function(){
		self.log('Reconnecting');
		self.quit();
		self.connect();
		return this;
	};
	self.quit = function(msg){
		msg = msg === undefined?'Bot shutting down':msg;
		try{
			self.send('QUIT :'+msg);
		}catch(e){}
		try{
			self.socket.end();
		}catch(e){}
		try{
			self.socket.destroy();
		}catch(e){}
		return this;
	};
	process.on('exit',function(){
		self.quit();
	});
	self.on(/^PING :(.+)/i,function(m){
		self.send('PONG :'+m[1]);
	});
	self.on(/:.+ 001 .+ :.+/i,function(){
		var i;
		for(i=0;i<config.channels.length;i++){
			self.join(config.channels[i]);
		}
		if(this.config.nickserv !== undefined){
			self.send('PRIVMSG NickServ :identify '+this.config.nickserv.nick+' '+this.config.nickserv.password);
		}
	});
	return self;
};