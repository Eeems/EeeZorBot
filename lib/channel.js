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
	 * Channel modes
	 * @type {Array}
	 * @property modes
	 */
	self.modes = [];
	/**
	 * Contains the topic of the channel
	 * To set the value without sending a topic command change the value to an array with the topic in it (ie: ['new topic'])
	 * @type {String}
	 * @property topic
	 */
	Object.defineProperty(self,'topic',{
		set: function(val){
			if(!(val instanceof Array)){
				self.server.send('TOPIC '+self.name+' '+val);
			}else{
				topic = val[0];
			}
		},
		get: function(){
			return topic;
		},
		enumerable: true
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
		while(self.users().length > 0){
			user = self.users()[0];
			user.channels.splice(user.channels.indexOf(self));
		}
		self.server.send('WHO '+self.name);
		return self;
	};
	/**
	 * Returns an array of all the users in the channel
	 * @method users
	 * @return {Array} users
	 */
	self.users = function(){
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
	};
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
		return self;
	};
	/**
	 * Join the channel
	 * @method join
	 * @chainable
	 */
	self.join = function(){
		self.server.send('join '+self.name);		// join channel
		return self;
	};
	return self;
};