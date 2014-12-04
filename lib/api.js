/**
 * API class, contains references to all important modules
 * @module api
 * @class api
 * @static
 */
var api = {
		/**
		 * Provides the tools module
		 * @static
		 * @property tools
		 */
		tools: require('./tools.js'),
		/**
		 * Provides the log module
		 * @static
		 * @property log
		 */
		log: require('./log.js'),
		/**
		 * Provides the Channel class
		 * @static
		 * @constructor
		 * @property Channel
		 */
		Channel: require('./channel.js'),
		/**
		 * Provides the User class
		 * @static
		 * @property User
		 * @constructor
		 */
		User: require('./user.js'),
		/**
		 * Provides the Server class
		 * @static
		 * @property Server
		 * @constructor
		 */
		Server: require('./server.js'),
		/**
		 * Provides the stdin module
		 * @static
		 * @property stdin
		 */
		stdin: require('./stdin.js'),
		/**
		 * Provides the Listdb class
		 * @static
		 * @property Listdb
		 * @constructor
		 */
		Listdb: require('./listdb.js'),
		/**
		 * Provides the db class
		 * @static
		 * @property db
		 * @constructor
		 */
		db: require('./db.js'),
		/**
		 * Provides the debug module
		 * @static
		 * @property debug
		 */
		debug: require('./debug.js'),
		/**
		 * Provides the owners interface
		 * @static
		 * @property owners
		 * @constructor
		 */
		owners: require('./owners.js'),
		/**
		 * Provides the http interface
		 * @static
		 * @property http
		 * @constructor
		 */
		http: require('./http.js'),
		/**
		 * Provides a circular reference to API
		 * @static
		 * @property api
		 */
		api: api,
		/**
		 * Provides access to the global console object
		 * @static
		 * @property console
		 */
		console: console,
		/**
		 * Provides access to the global process object
		 * @static
		 * @property process
		 */
		process: process
	},
	servers = [],
	i;
/**
 * Provides access to all servers
 * @static
 * @property servers
 */
Object.defineProperty(api,'servers',{
	get: function(){
		return servers;
	},
	set: function(){
		throw "You can't change this variable";
	}
});
/**
 * The API version
 * @property version
 * @type {String}
 * @protected
 */
Object.defineProperty(api,'version',{
	value: '0.2',
	writable: false
});
module.exports = api;