var storage = require('node-persist'),
	tools = require('./tools.js');
storage.initSync({
	dir: 'bans/'
});
/**
 * bans class
 * @module bans
 * @class bans
 * @static
 */
module.exports = (function(){
	var self = this,
		bans;
	/**
	 * Returns all the bans
	 * @method values
	 * @return {Map} bans
	 */
	self.values = function(){
		self.fetch();
		return bans;
	};

	self.each = function(callback){
		bans.forEach(function(b,i){
			callback(b,b,i);
		});
	};
	/**
	 * The number of bans stored
	 * @type {Number}
	 * @property length
	 * @static
	 */
	// Object.defineProperty(self,'length',{
	// 	enumerable: true,
	// 	get: function(){
	// 		self.fetch();
	// 		return bans.length;
	// 	}
	// });
	/**
	 * Fetch the current state of the object
	 * @method fetch
	 * @chainable
	 */
	self.fetch = function(){
		bans = storage.getItem('bans');
		return self;
	};
	/**
	 * Flushes changes to the object
	 * @method flush
	 * @chainable
	 */
	self.flush = function(){
		storage.setItem('bans',bans);
		return self;
	};
	/**
	 * Adds a hostmask to a owner
	 * @method addHostMask
	 * @param {String} nick     The nick the owner is registered under
	 * @param {String} hostmask The hostmask to add to the owner
	 * @chainable
	 */
	self.add = function(hostmask){
		if(bans.indexOf(hostmask)==-1){
			bans.push(hostmask);
			self.flush();
		}
		return self;
	};
	/**
	 * Remove a hostmask from a owner
	 * @param  {String} nick     The nick the owner is registered under
	 * @param  {String} hostmask The hostmask to remove from the owner
	 * @chainable
	 */
	self.remove = function(hostmask){
		if(bans.indexOf(hostmask)!=-1){
			bans.splice(bans.indexOf(hostmask),1);
			self.flush();
		}
		return self;
	};
	/**
	 * Returns the owner who matches the hostmask
	 * @param  {String} hostmask Hostmask to search for.
	 * @return {Object}          owner who matched the hostmask, undefined if none found.
	 */
	self.match = function(hostmask){
		self.fetch();
		bans.forEach(function(ban){
			if(ban.indexOf('*') != -1){
				var s = tools.wildcardString(ban);
				if(hostmask.search(new RegExp(s)) != -1){
					return ban;
				}
			}else if(ban == hostmask){
				return ban;
			}
		});
	};
	self.fetch();
	if(bans === undefined){
		bans = [];
		self.flush();
	}
	return self;
})();