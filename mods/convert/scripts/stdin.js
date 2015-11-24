var fs = require('fs'),
	path = require('path');
function get_servers(callback){
	var ret = [];
	fs.readdir('data/logs/',function(e, l_servers){
		if(e){
			throw e;
		}else{
			l_servers.forEach(function(l_server){
				if(l_server.search(/^[\w\.]+ \d{4}$/)!=-1){
					var stats = fs.statSync('data/logs/'+l_server);
					if(stats.isDirectory()){
						var l_channels = fs.readdirSync('data/logs/'+l_server),
							channels = [];
						l_channels.forEach(function(l_channel){
							if(l_channel.search(/^\#\w+$/)!=-1){
								channels.push({
									name: l_channel,
									path: 'data/logs/'+l_server+l_channel
								});	
							}
						});
						ret.push({
							name: l_server.split(' ')[0],
							port: l_server.split(' ')[1],
							path: 'data/logs/'+l_server,
							channels: channels
						});
					}
				}
			});
			callback(ret);
		}
	});
}

stdin.add('convert',function(argv){
	get_servers(function(l_servers){
		var actions = {
				help: function(){
					stdin.console('log','Available actions:');
					stdin.console('log',Object.keys(actions).join(', '));
				},
				ls: function(argv){
					var a = [];
					if(argv.length == 0){
						l_servers.forEach(function(l_server){
							a.push(l_server.name);
						});
					}else if(argv.length == 1){
						l_servers[argv[0]].channels.forEach(function(l_channel){
							a.push(l_channel.name);
						})
					}
					a.forEach(function(v,i){
						stdin.console('log',i+') '+v);
					});
				}
			},i;
		if(argv.length>1){
			if(actions[argv[1]]){
				actions[argv[1]].call(this,argv.splice(2));
			}else{
				stdin.console('log','Unknown convert action: '+argv[1]);
			}
		}else{
			actions.help();
		}
	});
},'Perform log conversion actions');