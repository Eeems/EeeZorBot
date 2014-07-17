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
				// TODO - Handle connection
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
			// TODO - too large
		}
		try{
			self.logOut(d);
			self.socket.write(d+'\r\n','ascii',function(){
				// TODO - data sent
			});
		}catch(e){
			self.error(e);
			// TODO - data failed to send
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
	self.on(new RegExp(':.+ 315 .+ (\\S+) :End of \/WHO list.','i'),function(m){
		var c = self.channel(m[1]);
		if(!c){
			c = new Channel(m[1]);
			self.channels.push(c);
		}
		self.fire('who',[c],self);
	});
	self.on(new RegExp(':.+ 352 .+ (.+) (.+) (.+) (.+) (.+) .+ :(\\d+) (.+)','i'),function(m){
		var user = self.user([5]),
			channel = self.channel(m[1]);
		if(!channel){
			channel = new Channel(m[1]);
			self.channels.push(channel);
		}
		if(user){
			if(user.channels.indexOf(channel)){
				user.channels.push(channel);
			}
		}else{
			user = new User(m[5],m[2],m[3],m[7]);
			user.channels.push(channel);
			self.user(user);
		}
	});
	var fn = function(i){
		self.scripts[ii] = new Script(config.scripts[ii],self,i);
	};
	for(ii = 0;ii < config.scripts.length; ii++){
		self.debug("Loading Script: "+config.scripts[ii]);
		self.run(ii+1,fn);
	}
	return self;
};