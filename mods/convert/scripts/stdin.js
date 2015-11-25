var fs = require('fs'),
	path = require('path'),
	id = {
		channel: function(name,server){
			var sid = id.server(server),
				cid = db.querySync("select id from channels where name = ? and s_id = ?",[name,sid])[0];
			return cid===undefined?db.insertSync('channels',{name:name,s_id:sid}):cid.id;
		},
		user: function(nick){
			var uid = db.querySync("select id from users where name = ?",[nick])[0];
			return uid===undefined?db.insertSync('users',{name:nick}):uid.id;
		},
		type: function(name){
			var tid = db.querySync("select id from types where name = ?",[name])[0];
			return tid===undefined?db.insertSync('types',{name:name}):tid.id;
		},
		server: function(server){
			var sid = db.querySync("select id from servers where host = ? and port = ?",[server.name,server.port])[0];
			return sid===undefined?db.insertSync('servers',{name:server.name,host:server.name,port:server.port}):sid.id;
		}
	};
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
							channels = [],
							server = {
								name: l_server.split(' ')[0],
								port: l_server.split(' ')[1],
								path: 'data/logs/'+l_server+'/',
								channels: channels,
								type: 'server'
							};
						l_channels.forEach(function(l_channel){
							if(l_channel.search(/^\#\w+$/)!=-1){
								channels.push({
									name: l_channel,
									path: 'data/logs/'+l_server+'/'+l_channel+'/',
									type: 'channel',
									server: server
								});	
							}
						});
						ret.push(server);
					}
				}
			});
			callback(ret);
		}
	});
}
function convert(obj){
	if(obj && obj.name && obj.type && obj.path){
		stdin.console('log','Converting '+obj.name);
		switch(obj.type){
			case 'server':
				obj.channels.forEach(convert);
			break;
			case 'channel':
				var passed = 0,
					failed = 0,
					skipped = 0;
				fs.readdirSync(obj.path).forEach(function(l_log){
					if(path.extname(l_log) == '.db'){
						fs.readFileSync(obj.path+l_log,{
								encoding: 'ascii'
							})
							.split("\n")
							.forEach(function(d){
								try{
									d = JSON.parse(d.replace(/\n$/, ""));
									if(!d.user){
										d.user = 'server';
									}
									if(d.type){
										d.c_id = id.channel(obj.name,obj.server);
										d.u_id = id.user(d.user);
										d.t_id = id.type(d.type);
										d.date = "STR_TO_DATE("+db.escape((new Date(d.date)).toISOString())+",'%Y-%m-%dT%T.%fZ')";
										r = db.querySync("SELECT COUNT(1) as num FROM messages WHERE c_id = ? AND u_id = ? AND t_id = ? AND `date` = "+d.date,[d.c_id,d.u_id,d.t_id]);
										if(0 === r.num){
											db.querySync("INSERT INTO messages SET text = ?,c_id = ?,u_id = ?, t_id = ?,date = "+d.date,[d.msg,d.c_id,d.u_id,d.t_id]);
											passed++;
										}else{
											skipped++;
										}
									}else{
										failed++;
									}
								}catch(e){
									failed++
								}
							});
					}
				});
				stdin.console('log',obj.name+' conversion. '+passed+' passed, '+failed+' failed, '+skipped+' skipped.');
			break;
		}
	}else{
		stdin.console('error','Unable to convert: '+JSON.stringify(obj));
	}
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
				},
				do: function(argv){
					if(argv.length === 0){
						l_servers.forEach(convert);
					}else if(argv.length == 1){
						convert(l_servers[argv[0]]);
					}else if(argv.length == 2){
						convert(l_servers[argv[0]].channels[argv[1]]);
					}else{
						stdin.console('log','Invalid argument length');
					}
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