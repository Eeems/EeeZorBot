/**
 * User object constructor
 * @class User
 * @module user
 * @main
 * @param {string} nick
 * @param {string} username
 * @param {string} host
 * @param {string} realname
 * @constructor
 */
var owners = require('./owners.js'),
	bans = require('./bans.js');
module.exports = function(nick,username,host,realname,server){
	var self = this;
	/**
	 * User nickname
	 * @type {String}
	 * @property nick
	 */
	self.nick = nick;
	/**
	 * User's username
	 * @type {string}
	 * @property username
	 */
	self.username = username;
	/**
	 * User's hostname
	 * @type {string}
	 * @property host
	 */
	self.host = host;
	/**
	 * User's real name
	 * @type {string}
	 * @property realname
	 */
	self.realname = realname;
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
	 * Array of channels the user is in
	 * @type {Array}
	 * @property channels
	 */
	self.channels = [];
	/**
	 * List of the modes applied to the user in a channel
	 * @type {Object}
	 * @property modes
	 */
	self.modes = {};
	/**
	 * Runs a whois on the user
	 * @method whois
	 * @chainable
	 */
	self.whois = function(){
		self.server.send('WHOIS '+self.nick);
		return self;
	};
	/**
	 * The current hostmask for the user
	 * @property hostmask
	 * @type {String}
	 */
	Object.defineProperty(self,'hostmask',{
		get: function(){
			return self.nick+'!'+self.username+'@'+self.host;
		}
	});
	/**
	 * Get the owner object for this user if it exists
	 * @property owner
	 * @type {String}
	 */
	Object.defineProperty(self,'owner',{
		get: function(){
			var owner = owners.match(self.hostmask);
			if(owner === undefined){
				owner = {
					nick: self.nick,
					hostmasks: [
						self.hostmask
					],
					flags: ''
				};
			}
			return owner;
		}
	});
	Object.defineProperty(self,'banned',{
		get: function(){
			return bans.match(self.hostmask);
		}
	});
	return self;
};