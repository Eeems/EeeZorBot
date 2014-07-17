/**
 * User object constructor
 * @class User
 * @module user
 * @param {string} nick
 * @param {string} username
 * @param {string} host
 * @param {string} realname
 * @constructor
 */
module.exports = function(nick,username,host,realname){
	/**
	 * User nickname
	 * @type {String}
	 * @property nick
	 */
	this.nick = nick;
	/**
	 * User's username
	 * @type {string}
	 * @property username
	 */
	this.username = username;
	/**
	 * User's hostname
	 * @type {string}
	 * @property host
	 */
	this.host = host;
	/**
	 * User's real name
	 * @type {string}
	 * @property realname
	 */
	this.realname = realname;
	/**
	 * Array of channels the user is in
	 * @type {Array}
	 * @property channels
	 */
	this.channels = [];
	/**
	 * List of the modes applied to the user
	 * @type {Array}
	 * @property modes
	 */
	this.modes = [];
	return this;
};