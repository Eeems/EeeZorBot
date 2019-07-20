/* global stdin owners bans script */
stdin.add('owners', async function(argv){
    stdin.console('log', 'Owners:');
    await owners.each(function(owner, nick){
        stdin.console('log', '  ' + nick);
    });
}, 'Displays a list of owners')
    .add('owner', async function(argv){
        if(argv.length){
            var owner = await owners.get(argv[1]);
            if(owner){
                stdin.console('log', '   Flags: ' + owner.flags);
                if(owner.hostmasks.length > 0){
                    stdin.console('log', '   Hostmasks:');
                    owner.hostmasks.forEach(function(mask){
                        stdin.console('log', '     ' + mask);
                    });
                }
            }else{
                stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
            }
        }else{
            stdin.console('log', 'No owner name provided');
        }
    }, '<nick>\nDisplays owner information')
    .add('+owner', async function(argv){
        if(await owners.get(argv[1])){
            stdin.console('log', 'Owner ' + argv[1] + ' already exists');
        }else{
            await owners.add(argv[1]);
            stdin.console('log', 'Owner ' + argv[1] + ' added');
        }
    }, '<nick>\nAdds a new owner')
    .add('-owner', async function(argv){
        if(await owners.get(argv[1])){
            await owners.remove(argv[1]);
            stdin.console('log', 'Owner ' + argv[1] + ' removed');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick>\nRemoves an owner')
    .add('+host', async function(argv){
        if(await owners.match(argv[2])){
            stdin.console('log', 'Hostmask alrady in use');
        }else if(await owners.get(argv[1])){
            await owners.addHostMask(argv[1], argv[2]);
            stdin.console('log', 'Hostmask added');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <hostmask>\nAdds a hostmask to an owner')
    .add('-host', async function(argv){
        await owners.removeHostMask(argv[1]);
        stdin.console('log', 'Hostmask removed');
    }, '-host <hostmask>\nRemoves a hostmask to an owner')
    .add('match', async function(argv){
        var owner = await owners.match(argv[1]);
        if(owner){
            stdin.console('log', 'Hostmask matches ' + owner.nick);
        }else{
            stdin.console('log', 'Hostmask ' + argv[1] + " doesn't match any owners");
        }
    }, '<hostmask>\nSees if an owner matches the supplied hostmask')
    .add('+flag', async function(argv){
        if(await owners.get(argv[1])){
            await owners.addFlags(argv[1], argv[2]);
            stdin.console('log', 'Flags added');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <flag(s)>\nAdds one or more flag to an owner')
    .add('-flag', async function(argv){
        if(await owners.get(argv[1])){
            await owners.removeFlags(argv[1], argv[2]);
            stdin.console('log', 'Flags removed');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <flag(s)>\nRemoves one or more flag to an owner')
    .add('bans', async function(argv){
        stdin.console('log', 'Bans:');
        await bans.each(function(ban){
            stdin.console('log', '  ' + ban.hostmask);
        });
    }, 'displays all existing bans')
    .add('+ban', async function(argv){
        await bans.add(argv[1]);
        stdin.console('log', 'Ban added');
    }, '<hostmask>\nAdds a ban for a hostmask')
    .add('-ban', async function(argv){
        await bans.remove(argv[1]);
        stdin.console('log', 'Ban removed');
    }, '<hostmask>\nRemoves a ban for a hostmask');
script.unload = () => {
    stdin.remove('owners');
    stdin.remove('owner');
    stdin.remove('+owner');
    stdin.remove('-owner');
    stdin.remove('+host');
    stdin.remove('-host');
    stdin.remove('match');
    stdin.remove('+flag');
    stdin.remove('-flag');
    stdin.remove('bans');
    stdin.remove('+ban');
    stdin.remove('-ban');
};
