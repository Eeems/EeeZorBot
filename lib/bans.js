var storage = require('node-persist'),
	tools = require('./tools.js'),
	s = require('sanitize-filename');
/**
 * bans class
 * @module bans
 * @class bans
 * @static
 */
module.exports = (function(){
	var self = {},
		db = storage.create({
			dir: 'bans/'
		});
	db.initSync();
	Object.defineProperty(self,'values',{
		enumerable: true,
		get: function(){
			return db.values();
		}
	});
	self.each = function(callback){
		db.forEach(function(key,value){
			callback(value,value,key);
		});
	};
	Object.defineProperty(self,'length',{
		enumerable: true,
		get: function(){
			return db.length();
		}
	});
	/**
	 * Adds a hostmask to a owner
	 * @method addHostMask
	 * @param {String} nick     The nick the owner is registered under
	 * @param {String} hostmask The hostmask to add to the owner
	 * @chainable
	 */
	self.add = function(hostmask){
		var k = s(hostmask);
		if(!db.getItem(k)){
			db.setItem(k,{
				hostmask: hostmask,
				regex: tools.wildcardString(hostmask)
			});
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
		db.removeItem(s(hostmask));
		return self;
	};
	/**
	 * Returns the owner who matches the hostmask
	 * @param  {String} hostmask Hostmask to search for.
	 * @return {Object}          owner who matched the hostmask, undefined if none found.
	 */
	self.match = function(hostmask){
		var ret;
		self.each(function(ban){
			if(ban.hostmask.indexOf('*') != -1){
				if(hostmask.search(new RegExp(ban.regex)) != -1){
					ret = ban;
				}
			}else if(ban.hostmask == hostmask){
				ret = ban;
			}
		});
	};
	return self;
})();