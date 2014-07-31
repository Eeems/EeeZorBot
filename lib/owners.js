var storage = require('node-persist'),
	tools = require('./tools.js');
storage.initSync({
	dir: 'owners/'
});
/**
 * Owners class
 * @module owners
 * @class owners
 * @static
 */
module.exports = (function(){
	var self = this,
		owners;
	/**
	 * Returns all the owners
	 * @method values
	 * @return {Map} owners
	 */
	self.values = function(){
		self.fetch();
		return owners;
	};
	/**
	 * The number of owners stored
	 * @type {Number}
	 * @property length
	 * @static
	 */
	Object.defineProperty(self,'length',{
		enumerable: true,
		get: function(){
			self.fetch();
			var i,
				c=0;
			for(i in owners){
				c++;
			}
			return c;
		}
	});
	/**
	 * Fetch the current state of the object
	 * @method fetch
	 * @chainable
	 */
	self.fetch = function(){
		owners = storage.getItem('owners');
		return self;
	};
	/**
	 * Flushes changes to the object
	 * @method flush
	 * @chainable
	 */
	self.flush = function(){
		storage.setItem('owners',owners);
		return self;
	};
	/**
	 * Gets a owner object
	 * @param  {String} nick nick that the owner is registered under
	 * @return {Map} The owner object
	 */
	self.get = function(nick){
		self.fetch();
		return owners[nick];
	};
	/**
	 * Adds or updates a owner
	 * @method add
	 * @param {String} nick The nick that the owner is registered under
	 * @param {Map} options parameters to store on the owner
	 * @chainable
	 */
	self.add = function(nick,options){
		self.fetch();
		var owner = owners[nick],
			i;
		if(owner === undefined){
			owner = {
				nick: nick,
				hostmasks: [],
				flags: 'v'
			};
		}
		for(i in options){
			owner[i] = options[i];
		}
		owners[nick] = owner;
		self.flush();
		return self;
	};
	/**
	 * Removes a owner from the object
	 * @method remove
	 * @param  {String} nick The nick that the owner is registered under
	 * @chainable
	 */
	self.remove = function(nick){
		self.fetch();
		var o = {},
			i;
		for(i in owners){
			if(i != nick){
				o[i] = owners[i];
			}
		}
		owners = o;
		self.flush();
		return self;
	};
	/**
	 * Adds a hostmask to a owner
	 * @method addHostMask
	 * @param {String} nick     The nick the owner is registered under
	 * @param {String} hostmask The hostmask to add to the owner
	 * @chainable
	 */
	self.addHostMask = function(nick,hostmask){
		if(self.match(hostmask) === undefined){
			var owner = owners[nick];
			if(owner === undefined){
				self.add(nick);
				owner = owners[nick];
			}
			owner.hostmasks.push(hostmask);
			owners[nick] = owner;
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
	self.removeHostMask = function(hostmask){
		var owner = self.match(hostmask),
			i;
		if(owner !== undefined){
			for(i=0;i<owner.hostmasks.length;i++){
				if(owner.hostmasks[i] == hostmask){
					owner.hostmasks.splice(i,1);
				}
			}
			owners[owner.nick] = owner;
		}
		self.flush();
		return self;
	};
	/**
	 * Returns the owner who matches the hostmask
	 * @param  {String} hostmask Hostmask to search for.
	 * @return {Object}          owner who matched the hostmask, undefined if none found.
	 */
	self.match = function(hostmask){
		self.fetch();
		var owner,
			i,
			ii,
			iii,
			h;
		console.log('Looking for match: '+hostmask);
		for(i in owners){
			owner = owners[i];
			console.log('	'+owner.nick);
			for(ii=0;ii<owner.hostmasks.length;ii++){
				h = owner.hostmasks[ii];
				console.log('		'+h);
				if(h.indexOf('*') != -1){
					var s = tools.wildcardString(h);
					console.log('			/'+s+'/ == '+hostmask.search(new RegExp(s)));
					if(hostmask.search(new RegExp(s)) != -1){
						return owner;
					}
				}else if(h == hostmask){
					return owner;
				}
			}
		}
	};
	self.fetch();
	if(owners === undefined){
		owners = {};
		self.flush();
	}
	return self;
})();