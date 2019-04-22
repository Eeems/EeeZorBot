/* global server log bans owners */
server.add('uptime', async function(){
    var t = this;
    if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('v')){
        this.user.send(process.uptime());
    }else{
        this.user.send('Not Permitted');
    }
}, 'Displays the current uptime of the bot')
    .add('exit', async function(){
        var t = this;
        if(t.user && await t.user.owner()){
            process.exit();
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Makes the bot exit')
    .add('quit', async function(){
        var t = this;
        if(t.user && await t.user.owner()){
            server.quit();
            log.log('quitting');
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Makes the bot quit from the current server')
    .add('+ban', async function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('b')){
                await bans.add(hostmask);
                t.channel.send('Ban added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +ban <hostmask>');
        }
    }, 'Adds a hostmask ban.')
    .add('-ban', async function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('b')){
                await bans.remove(hostmask);
                t.channel.send('Ban removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -ban <hostmask>');
        }
    }, 'Removes a hostmask ban')
    .add('bans', async function(){
        var t = this;
        if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('b')){
            if(bans.length){
                t.user.send('Bans:');
                await bans.each(function(ban){
                    t.user.send(' - ' + ban.hostmask);
                });
            }else{
                t.user.send('No bans.');
            }
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Lists all registered bans')
    .add('+owner', async function(nick){
        var t = this;
        if(nick){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                await owners.add(nick);
                t.channel.send('Owner added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +owner <nick>');
        }
    }, 'Adds a new owner')
    .add('-owner', async function(nick){
        var t = this;
        if(nick){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                await owners.remove(nick);
                t.channel.send('Owner removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -owner <nick>');
        }
    }, 'Removes an existing owner')
    .add('owners', async function(){
        var t = this;
        if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
            if(await owners.length()){
                t.user.send('Owners:');
                await owners.each(function(owner){
                    t.user.send(' - ' + owner.nick);
                });
            }else{
                t.user.send('No owners.');
            }
        }else{
            t.user.send('Not Permitted');
        }
    }, 'Lists all owners')
    .add('owner', async function(nick){
        var t = this;
        if(nick){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                var owner = await owners.get(nick); // eslint-disable-line one-var
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
    .add('+host', async function(nick, hostmask){
        var t = this;
        if(nick && hostmask){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                var owner = await owners.get(nick); // eslint-disable-line one-var
                if(owner){
                    await owners.addHostMask(nick, hostmask);
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
    .add('-host', async function(hostmask){
        var t = this;
        if(hostmask){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                await owners.removeHostMask(hostmask);
                t.user.send('Host mask removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -host <hostmask>');
        }
    }, 'Removes a host')
    .add('+flag', async function(nick, flags){
        var t = this;
        if(nick && flags){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                await owners.addFlags(nick, flags);
                t.user.send('Flag(s) added');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: +flag <nick> <flags>');
        }
    }, 'Adds one or more flags to an owner')
    .add('-flag', async function(nick, flags){
        var t = this;
        if(nick && flags){
            if(t.user && await t.user.owner() && ~(await t.user.owner()).flags.indexOf('q')){
                await owners.removeFlags(nick, flags);
                t.user.send('Flag(s) removed');
            }else{
                t.user.send('Not Permitted');
            }
        }else{
            t.user.send('Usage: -flag <nick> <flags>');
        }
    }, 'Removes one or more flags from an owner');
