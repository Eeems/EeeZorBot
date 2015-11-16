var User = require('./user.js'),
	debug = require('./debug.js'),
	tools = require('./tools.js');
/**
 * Channel class
 * @module channel
 * @main
 * @class Channel
 * @param {Server} server The server the channel is created on
 * @param {string} name the name of the channel (ie: "#irp")
 * @constructor
 */
module.exports = function(server,name){
	var self = this,
		topic = null;
	/**
	 * Name of the channel
	 * @type {string}
	 * @property name
	 */
	self.name = name;
	/**
	 * Is the bot in the channel?
	 * @type {boolean}
	 * @property active
	 */
	self.active = false;
	/**
	 * Channel modes
	 * @type {Array}
	 * @property modes
	 */
	self.modes = [];
	/**
	 * Contains the topic of the channel and tries to change it if set
	 * @type {String}
	 * @property topic
	 */
	Object.defineProperty(self,'topic',{
		set: function(val){
			self.server.send('TOPIC '+self.name+' '+val);
		},
		get: function(){
			return topic;
		},
		enumerable: true
	});
	/**
	 * Interface for setting the topic internally
	 * @property _topic
	 * @private
	 */
	Object.defineProperty(self,'_topic',{
		set: function(val){
			topic = val;
		},
		enumerable: false
	});
	/**
	 * Parent server
	 * @type {Server}
	 * @property server
	 * @static
	 */
	Object.defineProperty(self,'server',{
		value: server,
		enumerable: true
	});
	/**
	 * Runs a /who on the channel, refreshing user data
	 * @method who
	 * @chainable
	 */
	self.who = function(){
		var i,
			user;
		while(self.users.length > 0){
			user = self.users[0];
			user.channels.splice(user.channels.indexOf(self));
		}
		self.server.send('WHO '+self.name);
		return self;
	};
	/**
	 * Returns an array of all the users in the channel
	 * @property users
	 * @return {Array} users
	 */
	Object.defineProperty(self,'users',{
		get: function(){
			var users = [],
				i,
				user;
			for(i=0;i<server.users.length;i++){
				user = server.users[i];
				if(user.channels.indexOf(self) != -1){
					users.push(user);
				}
			}
			return users;
		},
		enumerable: true
	});
	/**
	 * Sets the mode of the channel, or users in the channel
	 * @method mode
	 * @param {string} modes String containing the modes (ie: "+o-v")
	 * @param {Array} [users] A list of users (nick or User objects) to apply the modes to
	 * @chainable
	 */
	self.mode = function(modes,users){
		// TODO - fix
		if(users === undefined){
			self.server.send('mode '+self.name+' '+modes);
		}else{
			var i,
				u;
			users = users instanceof Array?users:[users];
			for(i=0;i<users.length;i++){
				u = users[i];
				if(u instanceof User){
					u = u.nick;
				}
				self.server.send('mode '+self.name+' '+modes+' '+u);
			}
		}
		return self;
	};
	/**
	 * Leave the channel
	 * @method part
	 * @chainable
	 */
	self.part = function(){
		self.server.send('part '+self.name);
		self.active = false;
		return self;
	};
	/**
	 * Join the channel
	 * @method join
	 * @chainable
	 */
	self.join = function(){
		self.server.send('join '+self.name);		// join channel
		self.active = true;
		return self;
	};
	/**
	 * Send a message to the channel
	 * @method send
	 * @param {String} msg Message to send to the channel
	 * @chainable
	 */
	self.send = function(msg){
		self.server.send('PRIVMSG '+self.name+' :'+msg);
		return self;
	};
	self.kick = function(user,msg){
		self.server.send('KICK '+self.name+' '+user.nick+(msg?' '+msg:''))
	}
	return self;
};