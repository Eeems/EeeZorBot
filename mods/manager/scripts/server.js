/* global server log bans owners */
server.add('uptime', function(){
    var t = this;
    if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('v')){
        this.user.send(process.uptime());
    }else{
        this.user.send('Not Permitted');
    }
}, 'Displays the current uptime of the bot')
    .add('exit', function(){
        var t = this;
        if(t.user && t.user.owner){
            process.exit();
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Makes the bot exit')
    .add('quit', function(){
        var t = this;
        if(t.user && t.user.owner){
            server.quit();
            log.log('quitting');
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Makes the bot quit from the current server')
    .add('+ban', function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('b')){
                bans.add(hostmask);
                t.channel.send('Ban added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +ban <hostmask>');
        }
    }, 'Adds a hostmask ban.')
    .add('-ban', function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('b')){
                bans.remove(hostmask);
                t.channel.send('Ban removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -ban <hostmask>');
        }
    }, 'Removes a hostmask ban')
    .add('bans', function(){
        var t = this;
        if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('b')){
            if(bans.length){
                t.user.send('Bans:');
                bans.each(function(ban){
                    t.user.send(' - ' + ban.hostmask);
                });
            }else{
                t.user.send('No bans.');
            }
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Lists all registered bans')
    .add('+owner', function(nick){
        var t = this;
        if(nick){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                owners.add(nick);
                t.channel.send('Owner added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +owner <nick>');
        }
    }, 'Adds a new owner')
    .add('-owner', function(nick){
        var t = this;
        if(nick){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                owners.remove(nick);
                t.channel.send('Owner removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -owner <nick>');
        }
    }, 'Removes an existing owner')
    .add('owners', function(){
        var t = this;
        if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
            if(owners.length){
                t.user.send('Owners:');
                owners.each(function(owner){
                    t.user.send(' - ' + owner.nick);
                });
            }else{
                t.user.send('No owners.');
            }
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Lists all owners')
    .add('owner', function(nick){
        var t = this;
        if(nick){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                var owner = owners.get(nick); // eslint-disable-line one-var
                t.user.send(' - Flags: ' + owner.flags);
                if(owner.hostmasks.length > 0){
                    t.user.send(' - Hostmasks:');
                    owner.hostmasks.forEach(function(mask){
                        t.user.send(' - - ' + mask);
                    });
                }
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: owner <nick>');
        }
    }, 'Displays information about an owner')
    .add('+host', function(nick, hostmask){
        var t = this;
        if(nick && hostmask){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                var owner = owners.get(nick); // eslint-disable-line one-var
                if(owner){
                    owners.addHostMask(nick, hostmask);
                    t.user.send('Host mask added');
                }else{
                    t.user.send('User does not exist');
                }
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +host <nick> <hostmask>');
        }
    }, 'Adds a host to an owner')
    .add('-host', function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                owners.removeHostMask(hostmask);
                t.user.send('Host mask removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -host <hostmask>');
        }
    }, 'Removes a host')
    .add('+flag', function(nick, flags){
        var t = this;
        if(nick && flags){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                owners.addFlags(nick, flags);
                t.user.send('Flag(s) added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +flag <nick> <flags>');
        }
    }, 'Adds one or more flags to an owner')
    .add('-flag', function(nick, flags){
        var t = this;
        if(nick && flags){
            if(t.user && t.user.owner && ~t.user.owner.flags.indexOf('q')){
                owners.removeFlags(nick, flags);
                t.user.send('Flag(s) removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -flag <nick> <flags>');
        }
    }, 'Removes one or more flags from an owner');
