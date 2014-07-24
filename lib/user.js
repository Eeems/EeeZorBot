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
	 */
	self.server = server;
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
	return self;
};