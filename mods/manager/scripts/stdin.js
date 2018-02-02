/* global server stdin owners bans */
server.add('owners', function(argv){
    stdin.console('log', 'Owners:');
    owners.each(function(owner, nick){
        stdin.console('log', '  ' + nick);
    });
}, 'Displays a list of owners')
    .add('owner', function(argv){
        if(argv.length){
            var owner = owners.get(argv[1]);
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
    .add('+owner', function(argv){
        if(owners.get(argv[1])){
            stdin.console('log', 'Owner ' + argv[1] + ' already exists');
        }else{
            owners.add(argv[1]);
            stdin.console('log', 'Owner ' + argv[1] + ' added');
        }
    }, '<nick>\nAdds a new owner')
    .add('-owner', function(argv){
        if(owners.get(argv[1])){
            owners.remove(argv[1]);
            stdin.console('log', 'Owner ' + argv[1] + ' removed');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick>\nRemoves an owner')
    .add('+host', function(argv){
        if(owners.match(argv[2])){
            stdin.console('log', 'Hostmask alrady in use');
        }else if(owners.get(argv[1])){
            owners.addHostMask(argv[1], argv[2]);
            stdin.console('log', 'Hostmask added');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <hostmask>\nAdds a hostmask to an owner')
    .add('-host', function(argv){
        owners.removeHostMask(argv[1]);
        stdin.console('log', 'Hostmask removed');
    }, '-host <hostmask>\nRemoves a hostmask to an owner')
    .add('match', function(argv){
        var owner = owners.match(argv[1]);
        if(owner){
            stdin.console('log', 'Hostmask matches ' + owner.nick);
        }else{
            stdin.console('log', 'Hostmask ' + argv[1] + " doesn't match any owners");
        }
    }, '<hostmask>\nSees if an owner matches the supplied hostmask')
    .add('+flag', function(argv){
        if(owners.get(argv[1])){
            owners.addFlags(argv[1], argv[2]);
            stdin.console('log', 'Flags added');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <flag(s)>\nAdds one or more flag to an owner')
    .add('-flag', function(argv){
        if(owners.get(argv[1])){
            owners.removeFlags(argv[1], argv[2]);
            stdin.console('log', 'Flags removed');
        }else{
            stdin.console('log', 'Owner ' + argv[1] + " doesn't exist");
        }
    }, '<nick> <flag(s)>\nRemoves one or more flag to an owner')
    .add('bans', function(argv){
        stdin.console('log', 'Bans:');
        bans.each(function(ban){
            stdin.console('log', '  ' + ban.hostmask);
        });
    }, 'displays all existing bans')
    .add('+ban', function(argv){
        bans.add(argv[1]);
        stdin.console('log', 'Ban added');
    }, '<hostmask>\nAdds a ban for a hostmask')
    .add('-ban', function(argv){
        bans.remove(argv[1]);
        stdin.console('log', 'Ban removed');
    }, '<hostmask>\nRemoves a ban for a hostmask');
