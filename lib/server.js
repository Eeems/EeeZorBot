var Channel = require('./channel.js'),
	User = require('./user.js'),
	Script = require('./script.js'),
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
			channels: [],
			scripts: []
		},
		sid = 0,
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
	self.scripts  = [];
	self.commands = {};
	self.help = new require('./help.js')();
	self.config = {};
	self.run = function(id,fn){
		var osid = sid;
		debug.log('Entering sid '+id);
		sid = id;
		fn.call(this,sid);
		debug.log('Reverting to sid '+osid);
		sid = osid;
		return this;
	};
	for(i in config){
		switch(i){
			case 'channels':break;
			case 'scripts':break;
			default:
				self.config[i] = config[i];
		}
	}
	self.log = function(msg){
		log.alert('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	self.logIn = function(msg){
		log.in('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	self.logOut = function(msg){
		log.out('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	self.logError = function(msg){
		log.error('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
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
				self.fire('data',arguments,self);
				var s = d.split("\r\n"),
					i,
					ii,
					match,
					hook;
				for(ii=0;ii<s.length;ii++){
					if(s[ii] !== ''){
						self.logIn(s[ii]);
						for(i=0;i<self.hooks.length;i++){
							hook = self.hooks[i];
							if(hook.type == 'regex'){
								match = hook.regex.exec(s[ii]);
								if(match){
									hook.fn.call(self,match,s[ii]);
									if(hook.once){
										self.hooks.splice(i,1);
									}
								}
							}
						}
					}
				}
				// TODO - incoming data
			});
			self.socket.on('drain',function(){
				self.fire('drain',arguments,self);
				// TODO - No more outgoing data
			});
			self.socket.on('error',function(e){
				self.log('Connection errored');
				self.fire('error',arguments,self);
				self.logError(e);
			});
			self.socket.on('timeout',function(){
				self.log('Connection timed out');
				self.fire('timeout',arguments,self);
				self.reconnect();
			});
			self.socket.on('end',function(){
				self.log('Connection ended');
				self.fire('end',arguments,self);
				// TODO - server closed connection
			});
			self.socket.on('close',function(e){
				self.fire('close',arguments,self);
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
				self.fire('connect',arguments,self);
				// TODO - Handle connection
			});
		}
		return self;
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
		return self;
	};
	self.on = function(hook,callback,once){
		debug.log('Adding hook for sid '+sid);
		once = once===undefined?false:once;
		if(hook instanceof RegExp){
			self.hooks.push({
				type: 'regex',
				regex: hook,
				fn: callback,
				once: once,
				sid: sid
			});
		}else{
			self.hooks.push({
				type: 'event',
				name: hook,
				fn: callback,
				once: once,
				sid: sid
			});
		}
		return self;
	};
	self.off = function(hook,callback){
		var i,
			h,
			t;
		for(i=0;i<self.hooks.length;i++){
			h = self.hooks[i];
			t = arguments.length === 0;
			if(sid === h.sid){
				if(!t){
					if(hook instanceof RegExp && h.type == 'regex' && h.regex === hook){
						t = true;
					}else if(h.type == 'event' && h.name === hook){
						t = true;
					}
					t = t && (callback === undefined || h.fn === callback);
				}
				if(t){
					self.hooks.splice(i,1);
				}
			}
		}
		return self;
	};
	self.add = function(command,callback){
		if(self.commands[command] === undefined){
			self.commands[command] = {
				fn: callback,
				sid: sid
			};
		}
		return self;
	};
	self.remove = function(command){
		if(command === undefined){
			for(var i in self.commands){
				if(self.commands[i].sid == sid){
					delete self.commands[i];
				}
			}
		}else{
			delete self.commands[command];
		}
		return self;
	};
	self.fire = function(name,args,scope){
		var i,
			hook;
		scope = scope===undefined?self:scope;
		for(i=0;i<self.hooks.length;i++){
			hook = self.hooks[i];
			if(hook.type == 'event' && hook.name == name){
				hook.fn.apply(scope,args);
			}
		}
		return self;
	};
	self.join = function(name){
		self.send('JOIN '+name);
		// TODO - handle adding to channel array if it doesn't already exist
		var channel = self.channel(name);
		if(!channel){
			channel = new Channel(self,name);
			self.channels.push(channel);
		}
		self.fire('join',arguments,self);
		return self;
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
			for(i=0;i<self.users.length;i++){
				if(self.users[i].nick === user.nick){
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
			for(i=0;i<self.users.length;i++){
				console.log(self.users[i].nick,user);
				if(self.users[i].nick === user){
					old = self.users[i];
				}
			}
			old = old===undefined?false:old;
		}
		return old;
	};
	self.script = function(sid){
		s = self.scripts[sid-1];
		return s===undefined||s===null?false:s;
	}
	self.reconnect = function(){
		self.log('Reconnecting');
		self.quit();
		self.connect();
		self.fire('reconnect',arguments,self);
		return self;
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
		self.fire('quit',arguments,self);
		return self;
	};
	process.on('exit',function(){
		self.quit();
	});
	self.on(/^PING :(.+)/i,function(m){
		self.send('PONG :'+m[1]);
		self.fire('ping',arguments,self);
	});
	self.on(/:.+ 001 .+ :.+/i,function(){
		var i;
		for(i=0;i<config.channels.length;i++){
			self.join(config.channels[i]);
		}
		if(self.config.nickserv !== undefined){
			self.send('PRIVMSG NickServ :identify '+self.config.nickserv.nick+' '+self.config.nickserv.password);
		}
	});
	self.on(new RegExp("^:(\\w+)!(.+)@(.+)\\sPRIVMSG\\s(\\#?\\w+)\\s:?"+tools.regexString(self.config.prefix)+"(\\S+)\\s?(.+)?$",'i'),function(m){
		var c = self.commands[m[5]],
			i,
			a = m[6],
			u = self.user(m[1]),
			ch = self.channel(m[4]);
		a = a===undefined?[]:a.split(' ');
		if(ch === false){
			ch = new Channel(self,m[4]);
		}
		if(u === false){
			u = new User(m[1],m[2],m[3],'');
			u.channels.push(ch);
			self.users.push(u);
		}
		if(c !== undefined){
			c.fn.apply({
				server: self,
				argv: a,
				channel: ch,
				user: u
			},a);
		}
	});
	for(ii = 0;ii < config.scripts.length; ii++){
		debug.log("Loading Script: "+config.scripts[ii]);
		self.run(ii+1,function(i){
			self.scripts[ii] = new Script(config.scripts[ii],self,i);
		});
	}
	return self;
};