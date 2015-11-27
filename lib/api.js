/**
 * API class, contains references to all important modules
 * @module api
 * @class api
 * @static
 */
var fs = require('fs'),
	api = {
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
		bans: require('./bans.js'),
		/**
		 * Provides the stdin module
		 * @static
		 * @property stdin
		 */
		stdin: require('./stdin.js'),
		/**
		 * Provides the pubsub module
		 * @static
		 * @property pubsub
		 */
		pubsub: require('./pubsub.js'),
		/**
		 * Provides the socket interface
		 * @static
		 * @property socket
		 * @constructor
		 */
		socket: require('./socket.js'),
		/**
		 * Provides the websocket interface
		 * @static
		 * @property websocket
		 * @constructor
		 */
		websocket: require('./websocket.js'),
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
		process: process,
		Script: require('./script.js'),
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
		mods: function(){
			return api.tools.mods.apply(api.tools,arguments);
		},
		template: require('./template.js')
	},
	servers = [],
	i;
Object.defineProperty(api,'config',{
	readonly: true,
	value: require('../etc/config.json')
});
Object.defineProperty(api,'stdin',{
	get: function(){
		return require('./stdin.js');
	},
	set: function(){
		throw "You can't change this variable";
	}
});
/**
 * Provides a circular reference to API
 * @static
 * @property api
 */
Object.defineProperty(api,'api',{
	get: function(){
		return require('./api.js');
	}
});
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