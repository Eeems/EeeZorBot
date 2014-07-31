var storage = require('node-persist'),
	tools = require('./tools.js');
tools.mkdirParent('data/users/');
storage.initSync({
	dir: 'data/users/'
});
/**
 * Users object
 * @module users
 * @class Users
 * @constructor
 */
module.exports = function(name,server){
	var self = this,
		users = storage.getItem(name);
	if(users === undefined){
		users = {};
		storage.setItem(name,users);
	}
	/**
	 * Returns all the users
	 * @method values
	 * @return {Map} users
	 */
	self.values = function(){
		self.fetch();
		return users;
	};
	/**
	 * Server the user is on
	 * @type {Server}
	 * @property server
	 * @static
	 */
	Object.defineProperty(self,'server',{
		value: server,
		enumerable: true
	});
	/**
	 * The number of users stored
	 * @type {Number}
	 * @property length
	 * @static
	 */
	Object.defineProperty(self,'length',{
		enumerable: true,
		get: function(){
			self.fetch();
			return users.length;
		}
	});
	/**
	 * Fetch the current state of the object
	 * @method fetch
	 * @chainable
	 */
	self.fetch = function(){
		users = storage.getItem(name);
		return self;
	};
	/**
	 * Flushes changes to the object
	 * @method flush
	 * @chainable
	 */
	self.flush = function(){
		storage.setItem(name,users);
		return self;
	};
	/**
	 * Gets a user object
	 * @param  {String} nick nick that the user is registered under
	 * @return {Map} The user object
	 */
	self.get = function(nick){
		self.fetch();
		return users[nick];
	};
	/**
	 * Adds or updates a user
	 * @method add
	 * @param {String} nick The nick that the user is registered under
	 * @param {Map} options parameters to store on the user
	 * @chainable
	 */
	self.add = function(nick,options){
		self.fetch();
		var user = users[nick],
			i;
		if(user === undefined){
			user = {
				nick: nick,
				hostmasks: [],
				flags: 'v'
			};
		}
		for(i in options){
			user[i] = options[i];
		}
		users[nick] = user;
		self.flush();
		return self;
	};
	/**
	 * Removes a user from the object
	 * @method remove
	 * @param  {String} nick The nick that the user is registered under
	 * @chainable
	 */
	self.remove = function(nick){
		self.fetch();
		var u = {},
			i;
		for(i in users){
			if(i != nick){
				u[i] = users[i];
			}
		}
		users = u;
		self.flush();
		return self;
	};
	/**
	 * Adds a hostmask to a user
	 * @method addHostMask
	 * @param {String} nick     The nick the user is registered under
	 * @param {String} hostmask The hostmask to add to the user
	 * @chainable
	 */
	self.addHostMask = function(nick,hostmask){
		if(self.match(hostmask) === undefined){
			var user = users[nick];
			if(user === undefined){
				self.add(nick);
				user = users[nick];
			}
			user.hostmasks.push(hostmask);
			users[nick] = user;
			self.flush();
		}
		return self;
	};
	/**
	 * Remove a hostmask from a user
	 * @param  {String} nick     The nick the user is registered under
	 * @param  {String} hostmask The hostmask to remove from the user
	 * @chainable
	 */
	self.removeHostMask = function(hostmask){
		var user = self.match(hostmask),
			i;
		if(user !== undefined){
			for(i=0;i<user.hostmasks.length;i++){
				if(user.hostmasks[i] == hostmask){
					user.hostmasks.splice(i,1);
				}
			}
			users[user.nick] = user;
		}
		self.flush();
		return self;
	};
	/**
	 * Returns the user who matches the hostmask
	 * @param  {String} hostmask Hostmask to search for.
	 * @return {Object}          User who matched the hostmask, undefined if none found.
	 */
	self.match = function(hostmask){
		self.fetch();
		var user,
			i,
			ii,
			iii,
			h;
		console.log('Looking for match: '+hostmask);
		for(i in users){
			user = users[i];
			console.log('	'+user.nick);
			for(ii=0;ii<user.hostmasks.length;ii++){
				h = user.hostmasks[ii];
				console.log('		'+h);
				if(h.indexOf('*') != -1){
					var s = tools.wildcardString(h);
					console.log('			/'+s+'/ == '+hostmask.search(new RegExp(s)));
					if(hostmask.search(new RegExp(s)) != -1){
						return user;
					}
				}else if(h == hostmask){
					return user;
				}
			}
		}
	};
	return self;
};