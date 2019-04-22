var storage = require('node-persist'),
    tools = require('./tools.js'),
    s = require('sanitize-filename');
/**
 * Owners class
 * @module owners
 * @class owners
 * @static
 */
module.exports = (function(){
    var self = {},
        _db,
        getDb = async function(){
            if(!_db){
                _db = storage.create({
                    dir: 'data/owners/'
                });
                await _db.init();
            }
            return _db;
        };
    self.values = async function(){
        return (await getDb()).values();
    };
    self.each = async function(callback){
        await (await getDb()).forEach(async function(item){
            var value = item.value;
            await callback.call(value, value, item.key);
        });
    };
    self.length = async function(){
        return (await getDb()).length();
    };
    self.get = async function(nick){
        return nick ? (await getDb()).getItem(s(nick)) : null;
    };
    self.add = async function(nick, options){
        var owner = await (await getDb()).getItem(s(nick)),
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
        self.update(owner);
        return self;
    };
    self.remove = async function(nick){
        await (await getDb()).removeItem(s(nick));
        return self;
    };
    self.update = async function(owner){
        await (await getDb()).setItem(s(owner.nick), owner);
    };
    self.addHostMask = async function(nick, hostmask){
        if(await self.match(hostmask) === undefined){
            var owner = await self.get(nick);
            if(owner === undefined){
                await self.add(nick);
                owner = await self.get(nick);
            }
            owner.hostmasks.push(hostmask);
            await self.update(owner);
        }
        return self;
    };
    self.removeHostMask = async function(hostmask){
        var owner = self.match(hostmask),
            i;
        if(owner !== undefined){
            for(i = 0; i < owner.hostmasks.length; i++){
                if(owner.hostmasks[i] === hostmask){
                    owner.hostmasks.splice(i, 1);
                }
            }
            await self.update(owner);
        }
        return self;
    };
    self.addFlags = async function(nick, flags){
        var owner = await self.get(nick);
        if(owner){
            flags.split('').forEach(function(f){
                if(owner.flags.indexOf(f) === -1){
                    owner.flags += f;
                }
            });
            await self.update(owner);
        }
        // TODO - handle flag sync across channels
        return self;
    };
    self.removeFlags = async function(nick, flags){
        var owner = await self.get(nick);
        if(owner){
            flags.split('').forEach(function(f){
                if(owner.flags.indexOf(f) !== -1){
                    owner.flags = owner.flags.replace(f, '');
                }
            });
            await self.update(owner);
        }
        // TODO - handle flag sync across channels
        return self;
    };
    self.match = async function(hostmask){
        var ret;
        await self.each(function(owner){
            var i, h, s;
            for(i = 0; i < owner.hostmasks.length; i++){
                h = owner.hostmasks[i];
                if(h.indexOf('*') !== -1){
                    s = tools.wildcardString(h);
                    if(hostmask.search(new RegExp(s)) !== -1){
                        ret = owner;
                    }
                }else if(h === hostmask){
                    ret = owner;
                }
            }
        });
        return ret;
    };
    return self;
})();
