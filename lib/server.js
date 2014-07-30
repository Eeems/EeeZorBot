var Channel = require('./channel.js'),
	User = require('./user.js'),
	Script = require('./script.js'),
	net = require('net'),
	tools = require('./tools.js'),
	log = require('./log.js'),
	stdin = require('./stdin.js'),
	debug = require('./debug.js'),
	api = require('./api.js');
process.on('SIGINT',function(){
	stdin.stop();
	process.exit();
});
/**
 * IRC Server object
 * @module server
 * @class server
 * @constructor
 * @param {object} config
 */
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
			scripts: [],
			showping: false
		},
		sid = 0,
		i,
		ii;
	for(i in defaults){
		if(config[i] === undefined){
			config[i] = defaults[i];
		}
	}
	/**
	 * Array of channels on the server
	 * @property channels
	 * @type {Array}
	 */
	self.channels = [];
	/**
	 * Array of users on the server that are known
	 * @property users
	 * @type {Array}
	 */
	self.users = [];
	/**
	 * Array of all hooks installed on the server
	 * @property hooks
	 * @type {Array}
	 */
	self.hooks = [];
	/**
	 * Array of all the scripts installed on the server
	 * @property scripts
	 * @type {Array}
	 */
	self.scripts  = [];
	/**
	 * Array of all the commands on the server
	 * @property commands
	 * @type {Object}
	 */
	self.commands = {};
	/**
	 * Server config
	 * @property config
	 * @type {Object}
	 */
	self.config = {};
	/**
	 * Run function in the context of a specific script
	 * @method run
	 * @param {number} id Script ID to run under (0 == run as server)
	 * @param {function} fn function to run
	 * @chainable
	 */
	self.run = function(id,fn){
		var osid = sid;
		self.debug('Entering sid '+id);
		sid = id;
		fn.call(self,sid);
		self.debug('Reverting to sid '+osid);
		sid = osid;
		return self;
	};
	for(i in config){
		switch(i){
			case 'channels':break;
			case 'scripts':break;
			default:
				self.config[i] = config[i];
		}
	}
	/**
	 * Log something in the context of the server
	 * @method log
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.log = function(msg){
		log.alert('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * Log something in the context of the server
	 * @method info
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.info = function(msg){
		log.info('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * Log something in the context of the server
	 * @method debug
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.debug = function(msg){
		debug.log('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * Log something in the context of the server
	 * @method error
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.error = function(msg){
		log.error('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * log.in something in the context of the server
	 * @method logIn
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.logIn = function(msg){
		log.in('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * log.out something in the context of the server
	 * @method logOut
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.logOut = function(msg){
		log.out('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * log.error something in the context of the server
	 * @method logError
	 * @param {mixed} msg Message to log
	 * @chainable
	 */
	self.logError = function(msg){
		log.error('['+self.config.host+':'+self.config.port+'] '+msg);
		return self;
	};
	/**
	 * Connect to the IRC server
	 * @method connect
	 * @chainable
	 */
	self.connect = function(){
		if(self.socket === undefined){
			log.log('Connecting to '+self.config.host+':'+self.config.port);
			self.socket = new net.Socket();
			self.socket.setNoDelay(true);
			self.socket.setEncoding('ascii');
			self.socket.on('connect',function(){
				self.info('Connection established (evt)');
				self.fire('connect',arguments,self);
			});
			self.socket.on('data',function(d){
				self.fire('data',arguments,self);
				var s = d.split("\r\n"),
					i,
					ii,
					match,
					hook,
					m,
					o;
				for(ii=0;ii<s.length;ii++){
					if(s[ii] !== ''){
						m = /^PING :(.+)/i.exec(s[ii]);
						if(m){
							if(self.config.showping){
								self.logIn(s[ii]);
							}else{
								o = log.config.levels.out;
								log.config.levels.out = false;
							}
							self.send('PONG :'+m[1]);
							if(!self.config.showping){
								log.config.levels.out = o;
							}
							self.fire('ping',arguments,self);
						}else{
							self.logIn(s[ii]);
						}
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
				self.debug('Drain event');
				self.fire('drain',arguments,self);
				// TODO - No more outgoing data
			});
			self.socket.on('error',function(e){
				self.info('Connection errored');
				self.fire('error',arguments,self);
				self.logError(e);
			});
			self.socket.on('timeout',function(){
				self.info('Connection timed out');
				self.fire('timeout',arguments,self);
				self.reconnect();
			});
			self.socket.on('end',function(){
				self.info('Connection ended');
				self.fire('end',arguments,self);
				// TODO - server closed connection
			});
			self.socket.on('close',function(e){
				self.fire('close',arguments,self);
				if(e){
					self.info('Connection closed due to an error');
					// TODO - socket was closed due to error
				}else{
					self.info('Connection closed');
					// TODO - socket closure was intended
				}
			});
			self.socket.connect(self.config.port,self.config.host,function(){
				self.info('Connection established');
				self.send('NICK '+self.config.nick);
				self.send('USER '+self.config.name+' localhost * '+self.config.name);
			});
		}
		return self;
	};
	/**
	 * Send a message to the IRC server
	 * @method send
	 * @param {string} d Message to send
	 * @chainable
	 */
	self.send = function(d){
		if(d.length > 510){
			self.fire('error',[new Error('Send String too long')],self);
			return self;
		}
		try{
			self.socket.write(d+'\r\n','ascii',function(){
				self.logOut(d);
				self.fire('send',[d],self);
			});
		}catch(e){
			self.error(e);
			self.fire('error',[e],self);
		}
		return self;
	};
	/**
	 * Install a hook on the server.
	 * @method on
	 * @param {string|RegExp} hook Hook to install (can be named or RegExp)
	 * @param {function} callback Callback to run when the hook fires
	 * @param {boolean} [once=false] Should this hook uninstall itself when it is run?
	 * @chainable
	 */
	self.on = function(hook,callback,once){
		self.debug('Adding hook for sid '+sid);
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
	/**
	 * Uninstall a hook from the server
	 * @method off
	 * @param {string|RegExp} hook Hook to remove
	 * @param {function} [callback] callback used in the hook you want to remove
	 * @chainable
	 */
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
					}else if(hook === undefined){
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
	/**
	 * Add a command to the server
	 * @method add
	 * @param {string} command Command name (used to invoke command)
	 * @param {function} callback Callback to run when command invoked
	 * @param {string} help Help line for the command
	 * @chainable
	 */
	self.add = function(command,callback,help){
		if(self.commands[command] === undefined){
			debug.log('Adding command: '+command+' with help entry: '+help);
			self.commands[command] = {
				fn: callback,
				sid: sid,
				help: help
			};
		}
		return self;
	};
	/**
	 * Remove a command listener from the server
	 * @method remove
	 * @param {string} command Command you want to remove
	 * @chainable
	 */
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
	/**
	 * Fire an event on the IRC server
	 * @method fire
	 * @param {string} name Name of the event to trigger
	 * @param {array} args Arguments to provide the event callbacks
	 * @param {mixed} scope What the event callbacks should use for the 'this' keyword
	 * @chainable
	 */
	self.fire = function(name,args,scope){
		var i,
			hook;
		scope = scope===undefined?self:scope;
		args = args===undefined?[]:args;
		for(i=0;i<self.hooks.length;i++){
			hook = self.hooks[i];
			if(hook.type == 'event' && hook.name == name){
				hook.fn.apply(scope,args);
			}
		}
		return self;
	};
	/**
	 * Join a channel
	 * @method join
	 * @param {string} name Channel name
	 * @chainable
	 */
	self.join = function(name){
		// TODO - handle adding to channel array if it doesn't already exist
		var channel = self.channel(name);
		if(!channel){
			channel = new Channel(self,name);
			self.channels.push(channel);
		}
		channel.join();
		self.fire('join',arguments,self);
		return self;
	};
	/**
	 * Leave a channel
	 * @method part
	 * @param {string} name Name of the channel
	 * @chainable
	 */
	self.part = function(name){
		var c = self.channel(name);
		if(c){
			c.part();
		}
		return self;
	};
	/**
	 * Check if in a channel
	 * @method in
	 * @param {string} name Name of the channel
	 * @return {boolean} status of server in channel
	 */
	self.in = function(name){
		// TODO - detect if actually joined to channel and not just created for shits/giggles... I mean for record keeping
		for(var i=0;i<self.channels.length;i++){
			if(self.channels[i].name == name){
				return true;
			}
		}
		return false;
	};
	/**
	 * Get a channel based on it's name
	 * @method channel
	 * @param {string} name Name of the channel
	 * @return {Channel|boolean} Returns false if channel doesn't exist. Returns the channel otherwise
	 */
	self.channel = function(name){
		for(var i=0;i<self.channels.length;i++){
			if(self.channels[i].name == name){
				return self.channels[i];
			}
		}
		return false;
	};
	/**
	 * Gets the user or syncs a user on the server
	 * @method user
	 * @param {string|User} user User object to sync or nick you want the user object for
	 * @return {User} The user object
	 */
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
				if(self.users[i].nick === user){
					old = self.users[i];
				}
			}
			old = old===undefined?false:old;
		}
		return old;
	};
	/**
	 * Gets a script based on the sid
	 * @method script
	 * @param {number} sid
	 * @return {boolean|Script} Returns false if script is not found, otherwise returns the script.
	 */
	self.script = function(sid){
		s = self.scripts[sid-1];
		return s===undefined||s===null?false:s;
	};
	/**
	 * Reconnects to the IRC server
	 * @method reconnect
	 * @chainable
	 */
	self.reconnect = function(){
		self.info('Reconnecting');
		self.quit();
		self.connect();
		self.fire('reconnect',arguments,self);
		return self;
	};
	/**
	 * Quits from the IRC server
	 * @method quit
	 * @param {string} [msg=string] Quit message. defaults to "Bot shutting down".
	 * @chainable
	 */
	self.quit = function(msg){
		self.fire('quit',arguments,self);
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
		delete self.socket;
		return self;
	};
	process.on('exit',function(){
		self.quit();
	});
	self.on('error',function(e){
			self.error(e);
		})
		.on(/:.+ 001 .+ :.+/i,function(){
			var i;
			for(i=0;i<config.channels.length;i++){
				self.join(config.channels[i]);
			}
			if(self.config.nickserv !== undefined){
				self.send('PRIVMSG NickServ :identify '+self.config.nickserv.nick+' '+self.config.nickserv.password);
			}
		})
		.on(new RegExp("^:(\\w+)!(.+)@(.+)\\sPRIVMSG\\s(\\#?\\w+)\\s:?"+tools.regexString(self.config.prefix)+"(\\S+)\\s?(.+)?$",'i'),function(m){
			// 1 - nick
			// 2 - username
			// 3 - host
			// 4 - channel
			// 5 - command
			// 6 - arguments
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
				u = new User(m[1],m[2],m[3],'',self);
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
		})
		.on(new RegExp(':.+ 315 .+ (\\S+) :End of \/WHO list.','i'),function(m){
			// 1 - channel
			var c = self.channel(m[1]);
			if(!c){
				c = new Channel(self,m[1]);
				self.channels.push(c);
			}
			self.fire('who',[c],self);
		})
		.on(new RegExp(':.+ 352 .+ (.+) (.+) (.+) (.+) (.+) .+ :(\\d+) (.+)','i'),function(m){
			// 1 - channel
			// 2 - username
			// 3 - host
			// 4 - 
			// 5 - nick
			// 6 - 
			// 7 - realname
			var user = self.user(m[5]),
				channel = self.channel(m[1]);
			if(!channel){
				channel = new Channel(self,m[1]);
				self.channels.push(channel);
			}
			if(user){
				if(user.channels.indexOf(channel)){
					user.channels.push(channel);
				}
			}else{
				user = new User(m[5],m[2],m[3],m[7],self);
				user.channels.push(channel);
				self.user(user);
			}
			user.whois();
		})
		.on(new RegExp(':.+ 311 .+ (\\S+) (.+) (.+) * :(.+)','i'),function(m){
			// 1 - nick
			// 2 - username
			// 3 - host
			// 4 - realname
			var user = self.user(m[1]);
			if(!user){
				user = new User(m[1],m[2],m[3],m[4],self);
				self.users.push(user);
			}else{
				user.username = m[2];
				user.host = m[3];
				user.realname = m[4];
			}
		})
		.on(new RegExp(':.+ 319 .+ (\\S+) :(.+)','i'),function(m){
			// 1 - Nick
			// 2 - channels
			var user = (function(nick){
					var u = self.user(nick);
					if(!u){
						u = new User(nick,'','','',self);
					}
					return u;
				})(m[1]),
				channels = m[2].split(' '),
				i,
				ii,
				channel,
				modes,
				mode;
			user.modes = {};
			for(i=0;i < channels.length;i++){
				channel = channels[i];
				modes = channel.substr(0,channel.indexOf('#'));
				channel = channel.substr(channel.indexOf('#'));
				channel = self.channel(channel);
				if(!channel){
					channel = new Channel(self,channels[i]);
					self.channels.push(channel);
				}
				if(user.channels.indexOf(channel) == -1){
					user.channels.push(channel);
				}
				user.modes[channel.name] = [];
				for(ii=0;ii < modes.length;ii++){
					mode = modes[i];
					switch(mode){
						case '+':
							mode='v';
						break;
						case '%':
							mode='h';
						break;
						case '@':
							mode='o';
						break;
						case '&':
							mode='a';
						break;
						case '~':
							mode='q';
						break;
					}
					if(mode !== undefined){
						user.modes[channel.name].push(mode);
					}
				}
			}
		})
		.on(new RegExp(':.+ 324 .+ (\\S+) \\+(.+)','i'),function(m){
			// 1 - channel
			// 2 - modes
			var channel = self.channel(m[1]),
				i,
				modes = m[2];
			if(!channel){
				channel = new Channel(m[1],self);
				self.channels.push(channel);
			}
			for(i in channel.modes){
				if(!(channel.modes[i] instanceof Array)){
					channel.modes[i] = modes.indexOf(i) !== -1;
				}
			}
		})
		.on(new RegExp(':.+ (367|348|346) \\S+ (\\S+) (\\S+) (\\S+) (\\d+)','i'),function(m){
			// 1 - code
			// 2 - channel
			// 3 - hostmask
			// 4 - user
			// 5 - timestamp
			var channel = self.channel(m[1]),
				i,
				mode;
			switch(m[1]){
				case 367:mode='b';break;
				case 348:mode='e';break;
				case 346:mode='I';break;
			}
			if(!channel){
				channel = new Channel(m[2],self);
				self.channels.push(channel);
			}
			if(!(channel.modes[mode] instanceof Array)){
				channel.modes[mode] = [];
			}
			if(channel.modes[mode].indexOf(m[3]) === -1){
				channel.modes[mode].push(m[3]);
			}
		})
		.on(new RegExp(':.+ (331|332) \\S+ (\\S+) :(.+)','i'),function(m){
			// 1 - code
			// 2 - channel
			// 3 - topic
			var channel = self.channel(m[2]);
			if(!channel){
				channel = new Channel(m[2],self);
				self.channels.push(channel);
			}
			if(m[1] == 331){
				channel.topic = [null];
			}else{
				channel.topic = [m[3]];
			}
		})
		.on(new RegExp(':(\\S+)\\!(.+)@(.+) TOPIC (\\S+) :(.+)','i'),function(m){
			// 1 - nick
			// 2 - username
			// 3 - host
			// 4 - channel
			// 5 - topic
			var channel = self.channel(m[4]);
			if(!channel){
				channel = new Channel(m[4],self);
				self.channels.push(channel);
			}
			channel.topic = [m[5]];
		})
		//:nodebot!~NodeBotSe@my.server.name JOIN :#irp
		.on(new RegExp(':(\\S+)\\!(.+)@(.+) JOIN :(\\S+)','i'),function(m){
			// 1 - nick
			// 2 - username
			// 3 - host
			// 4 - channel
			var channel = (function(){
					var c = self.channel(m[4]);
					if(!c){
						c = new Channel(m[4],self);
						self.channels.push(c);
					}
					return c;
				})(),
				user;
			if(m[1] == self.config.nick){
				channel.who();							// get users
				self.send('MODE '+channel.name);		// get modes
				self.send('MODE '+channel.name+' b');	// get bans
				self.send('MODE '+channel.name+' e');	// get exceptions
				self.send('MODE '+channel.name+' I');	// get invitation masks
			}else{
				user = self.user(m[1]);
				if(!user){
					user = new User(m[1],m[2],m[3],'',self);
					self.users.push(user);
				}
				user.channels.push(channel);
			}
		})
		.on(new RegExp(':(.+)\\!(.+)@(.+) MODE (\\S+) (\\S+) ?(.+)?','i'),function(m){
			// 1 - nick (doing the action)
			// 2 - username
			// 3 - host
			// 4 - channel
			// 5 - modes
			// 6 - nick (recieving the action)
			var guser = function(nick){
					var user = self.user(nick); //m[6]
					if(!user){
						user = new User(m[1],'','','',self);
						self.users.push(user);
					}
					if(user.channels.indexOf(channel) === -1){
						user.channels.push(channel);
					}
					if(user.modes[channel.name] === undefined){
						user.modes[channel.name] = [];
					}
					return user;
				},
				channel = self.channel(m[4]),
				i,
				ii = 0,
				user,
				state = m[5][0],
				mode,
				index,
				argv = m[6] === undefined?[]:m[6].split(' ');
			if(!channel){
				channel = new Channel(m[4],self);
			}
			for(i=1;i<m[5].length;i++){
				mode = m[5][i];
				if('+-'.indexOf(mode) !== -1){
					state = mode;
				}else{
					if('vhoaq'.indexOf(mode) !== -1 && argv[ii] !== undefined){
						user = guser(argv[ii]);
						if(state == '+'){
							if(user.modes[channel.name].indexOf(mode) === -1){
								user.modes[channel.name].push(mode);
							}
						}else{
							index = user.modes[channel.name].indexOf(mode);
							if(index !== -1){
								user.modes[channel.name].splice(index,1);
							}
						}
					}else if('bdefIJklLR'.indexOf() && argv[ii] !== undefined){
						if(state == '+'){
							if(!(channel.modes[mode] instanceof Array)){
								channel.modes[mode] = [];
							}
							channel.modes[mode].push(argv[ii]);
						}else{
							if(channel.modes[mode] instanceof Array){
								index = channel.modes[mode].indexOf(argv[ii]);
								if(index !== -1){
									channel.modes[mode].splice(index,1);
								}
								if(channel.modes[mode].length === 0){
									channel.modes[mode] = false;
								}
							}else{
								channel.modes[mode] = false;
							}
						}
					}else{
						channel.modes[mode] = state == '+';
					}
					ii++;
				}
			}
		})
		.add('help',function(){
			var i,a;
			if(this.argv.length === 0){
				var s = 'Available commands: ';
				for(i in self.commands){
					s += i+', ';
				}
				s = s.substr(0,s.length-2);
				self.send('PRIVMSG '+this.channel.name+' :'+s);
			}else{
				for(i in this.argv){
					a = this.argv[i];
					if(self.commands[a] === undefined){
						self.send('PRIVMSG '+this.channel.name+' :'+a+': undefined');
					}else{
						self.send('PRIVMSG '+this.channel.name+' :'+a+': '+self.commands[a].help);
					}
				}
			}
		},'Provides information on available commands');
	var fn = function(i){
		self.scripts[ii] = new Script(config.scripts[ii],self,i);
	};
	for(ii = 0;ii < config.scripts.length; ii++){
		self.debug("Loading Script: "+config.scripts[ii]);
		self.run(ii+1,fn);
	}
	api.servers.push(self);
	return self;
};