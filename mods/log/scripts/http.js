/*jshint multistr: true */
// Start http server if it isn't running already
var settings = (function(){
		var s = require('../etc/config.json').logs.server;
		if(s.listeners === undefined){
			s.listeners = [];
		}
		return s;
	})(),
	servers = [],
	dns = require('dns'),
	url = require('url'),
	deasync = require('deasync'),
	listdb = require('./listdb.js'),
	realdomains = (function(){
		var i,
			rd = new Listdb('realdomains').all(),
			realdomains = [],
			item;
		for(i in rd){
			try{
				item = JSON.parse(rd[i]);
				realdomains[item.domain] = item.valid;
			}catch(e){}
		}
		return realdomains;
	})(),
	hostname = function(href){
		var hostname = url.parse(href).hostname;
		return typeof hostname!='string'?url.parse('http://'+href).hostname:hostname;
	},
	toUrl = function(href){
		var u = url.parse(href);
		if(typeof u.hostname!='string'){
			u = url.parse('http://'+href);
		}
		return url.format(u);
	},
	isdomain = function(href){
		href = hostname(href);
		var sync = true,
			data;
		if(realdomains[href]===undefined){
			try{
				dns.lookup(href,function(e,a){
					data = e instanceof Error?false:typeof a=='string';
					sync = false;
				});
			}catch(e){
				log.trace(e);
				sync = false;
				data = false;
			}
			while(sync){
				deasync.sleep(1);
			}
			realdomains[href] = data;
		}else if(realdomains[href]){
			data = true;
		}
		return data;
	},
	handle = function(req,res){
		switch(req.method){
			case 'POST':
				var data = '';
				req.on('data',function(chunk){
					data += chunk;
				});
				req.on('end',function(){
					log.debug('Request Body: '+data);
				});
			break;
			case 'GET':
				var args = req.url.split('/').filter(Boolean);
				if(args.length === 0){
					db.query("\
						SELECT	id,\
								name\
						FROM servers\
					",function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head><meta charset='utf-8'/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\"><title>IRC Logs</title></head><body><strong><a href=\"/\">Logs</a></strong><br/>");
						for(var i in r){
							res.write("<a href=\"/"+r[i].id+"\">"+r[i].name+"</a><br/>");
						}
						res.write("</body></html>");
						res.end();
					});
				}else if(args.length == 1){
					db.query("\
						SELECT	id,\
								name\
						FROM channels\
						WHERE s_id = ?\
						AND name like '#%'\
					",[args[0]],function(e,r){
						if(e){
							throw e;
						}
						var server = db.querySync("select name from servers where id = ?",[args[0]])[0];
						if(server!==undefined){
							res.write("<html><head><meta charset='utf-8'/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\"><title>"+server.name+"</title></head><body><strong><a href=\"/\">Logs</a> "+server.name+"</strong><br/>");
							for(var i in r){
								res.write("<a href=\"/"+args[0]+'/'+r[i].id+"\">"+r[i].name+"</a><br/>");
							}
							res.write("</body></html>");
						}else{
							res.statusCode = 404;
							res.write("<html><head></head><body><a href=\"/\">Logs</a><br/>Not found</body></html>");
						}
						res.end();
					});
				}else{
					var ts = function(d){
							return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
						},
						d = new Date(+new Date),
						pastDate,
						nextDate,
						a,
						date,
						controls;
					if(args[2]===undefined){
						res.writeHead(302,{
							Location: req.url+'/'+ts(d)
						});
					}
					args[2] = args[2]===undefined?ts(d):args[2];
					a = args[2].split('-');
					date = new Date(a[0],parseInt(a[1],10)-1,a[2]);
					pastDate = new Date(date.getTime()-(24*60*60*1000));
					nextDate = new Date(date.getTime()+(24*60*60*1000));
					d= new Date(d.getFullYear(),d.getMonth(),d.getDate());
					db.query("\
						SELECT	m.id,\
								u.name AS user,\
								t.name AS type,\
								m.text,\
								DATE_FORMAT(m.date,'%H:%i:%s') as time,\
								DATE_FORMAT(m.date,'%Y-%m-%dT%H:%i:%sZ') as datetime\
						FROM messages m\
						JOIN types t\
							ON t.id = m.t_id\
						JOIN users u\
							ON u.id = m.u_id\
						WHERE m.date >= STR_TO_DATE(?,'%Y-%m-%d')\
						AND m.date <= DATE_ADD(STR_TO_DATE(?,'%Y-%m-%d'),INTERVAL 1 DAY)\
						AND m.c_id = ?\
						ORDER BY m.date ASC\
					",[args[2],args[2],args[1]],function(e,r){
						if(e){
							throw e;
						}
						var server = db.querySync("select name from servers where id = ?",[args[0]])[0],
							channel = db.querySync("select name from channels where id = ? and name like '#%'",[args[1]])[0];
						if(server!==undefined&&channel!==undefined){
								res.write("<!doctype html>\
									<html>\n\
										<head>\
											<meta charset='utf-8'/>\
											<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\
											<title>"+server.name+channel.name+"</title>\
											<style>\
												html,body{\
													width: 100%;\
													margin: 0;\
													padding: 0;\
													text-align: left;\
												}\
												#controls{\
													position: fixed;\
													top: 0;\
													left: 0;\
													width: 100%;\
												}\
												#controls>a,#controls>span>a{\
													cursor: pointer;\
													text-decoration: none;\
													color: black;\
												}\
												#controls>span.right{\
													float: right;\
												}\
												span{\
													color:black;\
													background-color: wite;\
													text-decoration: none;\
													font-weight: normal;\
													text-decoration: none;\
												}\
												div.line:target{\
													width: 100%;\
													background-color: yellow;\
												}\
												div.pre{\
													width: 100%;\
													position: absolute;\
													top: 45px;\
													bottom: 0;\
													overflow: auto;\
												}\
												div.line{\
													display: table;\
													white-space: pre-wrap;\
													width: 100%;\
												}\
												div.pre>div.line>span{\
													display: table-cell;\
												}\
												span.date{\
													width: 80px;\
												}\
												span.user{\
													cursor: pointer;\
												}\
												.type-notice,.type-topic,.type-datechange{\
													background-color: #C0DBFF;\
												}\
											</style>\
											<script>\
												window.onload = function(){\
													NodeList.prototype.forEach = Array.prototype.forEach;\
													document.querySelector('#controls>span.right>a.reload').onclick = function(){\
														location.reload();\
													};\
													var cache = {};\
													document.querySelectorAll('span.user').forEach(function(span){\
														span.onclick = function(){\
															window.open('http://stats.irc.omnimaga.org/index.php/user/nick:'+span.innerHTML+'/profile');\
														};\
													});\
												}\
											</script>\
										</head>\n\
										<body>\
											<div id=\"controls\">\
												<span class=\"right\">\
													<a href=\"#start\">&#8679;</a>\
													<br/>\
													<a href=\"#end\">&#8681;</a>\
												</span>\
												<span class=\"right\">\
													<a class=\"reload\">&#8634;</a>\
												</span>\
												<strong><a href=\"/\">Logs</a> <a href=\"/"+args[0]+"\">"+server.name+'</a> '+channel.name+' '+args[2]+"</strong>\
												<br/>\
												<a href=\"/"+args[0]+'/'+args[1]+'/'+ts(pastDate)+"\">&#8678;</a>\
												<a href=\"/"+args[0]+'/'+args[1]+'/'+ts(d)+"#end\">&#128198;</a>\
												<a href=\"/"+args[0]+'/'+args[1]+'/'+ts(nextDate)+"\">&#8680;</a>\
											</div>\
											<div class=\"pre\">\n\
												<span id=\"start\"></span>\n\
								");
								var m,t,
									htmlent = function(text){
										return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
									},
									parse = function(m){
										var style="",
											c,
											bg,
											t=m[0];
										switch(t){
											case "\x0f":
												t = "\x03";
											break;
											case "\x1f":
												t = "\x03";
												style="text-decoration:underline;";
											break;
											case "\x02":
												t="\x03";
												style="font-weight:bold;";
											break;
											case "\x03":
												c=m[1];
												if(/\d/.test(m[2])){
													c+=m[2];
													if(m[3] == ','){
														bg = m[4];
														if(/\d/.test(m[5])){
															bg+=m[5];
														}
													}
												}else if(m[2] == ','){
													bg = m[3];
													if(/\d/.test(m[4])){
														bg+=m[4];
													}
												}
											break;
										}
										return '</span>'+chunk(c,bg,style);
								},
								colourNick = function(nick){
									nick = htmlent(nick);
									var hash = (function(){
											var h = 0,
												i;
											for(i=0;i<nick.length;i++){
												h = nick.charCodeAt(i)+(h<<6)+(h<<16)-h;
											}
											return h;
										})(),
										deg = hash%360,
										hue = deg<0?360+deg:deg,
										light = hue>=30&&hue<=210?30:50,
										saturation = 20+Math.abs(hash)%80;
									return '<span class="user" title="View user '+nick+'" style="color:hsl('+hue+','+saturation+'%,'+light+'%)">'+nick+'</span>';
								},
								getColour = function(num,def){
									var c = [
										'white',
										'black',
										'blue',
										'green',
										'red',
										'brown',
										'purple',
										'orange',
										'yellow',
										'lime',
										'teal',
										'aqua',
										'royalblue',
										'fuchsia',
										'grey',
										'silver'
									][parseInt(num,0)];
									return c===undefined?def:c;
								},
								chunk = function(c,bg,style){
									style = style===undefined?'':style;
									return "<span style='color:"+getColour(c,'black')+";background-color:"+getColour(bg,'transparent')+";"+style+"'>";
								},
								links = function(href){
									return isdomain(href)?'<a href="'+toUrl(href)+'">'+href+'</a>':href;
								},
								ds = {},
								id,
								i;
							for(i in r){
								m = r[i];
								t = htmlent(m.text)
									.replace(/\b((?:\w*:?\/\/)?\w+\.\w\w+\/?[A-Za-z0-9_.-~\-]*#?[A-Za-z0-9_.\-~\-]*)\b/g,links)
									.replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g,parse)
									.trim();
								id = m.time;
								if(ds[id]!==undefined){
									id = id+'-'+m.id;
								}
								ds[id] = true;
								res.write('<div class="line type-'+m.type+'" id="'+id+'"><span class="date">[<a href="#'+id+'"><time datetime="'+m.datetime+'">'+m.time+'</time></a>] </span><span>'+chunk());
								switch(m.type){
									case 'topic':case 'datechange':
										res.write('<strong>Topic:</strong> '+t+' <em>set by '+colourNick(m.user)+'</em>');
									break;
									case 'join':
										res.write('<em>* '+colourNick(m.user)+' joined the channel</em>');
									break;
									case 'part':
										res.write('<em>* '+colourNick(m.user)+' left the channel</em>');
									break;
									case 'quit':
										res.write('<em>* '+colourNick(m.user)+' quit ('+t+')</em>');
									break;
									case 'action':
										res.write('<em>* '+colourNick(m.user)+' '+t+'</em>');
									break;
									case 'mode':
										res.write('<em>* '+colourNick(m.user)+' set mode '+channel.name+' '+t+'</em>');
									break;
									case 'notice':
										res.write('<strong>NOTICE</strong> '+colourNick(m.user)+': '+t);
									break;
									default:
										res.write('&lt;'+colourNick(m.user)+'&gt; '+t);
								}
								res.write("</span></span></div>\n");
							}
							res.write("<span id=\"end\"></span></div></body></html>");
						}else{
							res.statusCode = 404;
							res.write("<html><head></head><body><a href=\"/\">Logs</a><br/>Not found</body></html>");
						}
						res.end();
					});
				}
			break;
		}
	},
	i;
Object.observe(realdomains,function(){
	var rn = new Listdb('realdomains'),
		i,
		v;
	for(i in realdomains){
		v = JSON.stringify({
			domain: i,
			valid: realdomains[i]
		});
		if(!rn.has(v)){
			rn.add(v);
			rn.flush();
		}
	}
});
if(settings.host!==undefined&&settings.port!==undefined){
	settings.listeners.push({
		host: settings.host,
		port: settings.port
	});
}
for(i in settings.listeners){
	try{
		var l = settings.listeners[i],
			s = http.getServer(l.host,l.port).hold(script).handle(handle);
		servers.push(s);
	}catch(e){
		log.trace(e);
	}
}