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
        _db,
        getDb = async function(){
            if(!_db){
                _db = storage.create({
                    continuous: true,
                    dir: 'data/bans/'
                });
                await _db.init();
            }
            return _db;
        };
    self.values = async function(){
        return (await getDb()).values();
    };
    self.each = async function(callback){
        await (await getDb()).forEach(function(item){
            var value = item.value;
            callback(value, value, item.key);
        });
    };
    self.length = async function(){
        return (await getDb()).length();
    };
    /**
     * Adds a hostmask to a owner
     * @method addHostMask
     * @param {String} nick     The nick the owner is registered under
     * @param {String} hostmask The hostmask to add to the owner
     * @chainable
     */
    self.add = async function(hostmask){
        var k = s(hostmask),
            db = await getDb();
        if(!await db.getItem(k)){
            await db.setItem(k, {
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
    self.remove = async function(hostmask){
        await (await getDb()).removeItem(s(hostmask));
        return self;
    };
    /**
     * Returns the owner who matches the hostmask
     * @param  {String} hostmask Hostmask to search for.
     * @return {Object}          owner who matched the hostmask, undefined if none found.
     */
    self.match = async function(hostmask){
        var ret;
        await self.each(function(ban){
            if(~ban.hostmask.indexOf('*')){
                if(hostmask.search(new RegExp(ban.regex)) !== -1){
                    ret = ban;
                }
            }else if(ban.hostmask === hostmask){
                ret = ban;
            }
        });
        return ret;
    };
    return self;
})();
