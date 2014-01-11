fs.mkdirParent("data/logs/");
fs.mkdirParent('data/templates/');
if(!fs.exists('data/templates/chatlog.html')){
	var template = '<html><head><title>{Title}</title></head><body>{Item(<a href="{Link}" name="{Anchor}">{timestamp}</a>{Text}<br/>)}<a name="end"></a></body></html>';
	fs.writeFile('data/templates/chatlog.html',template,function(err) {
		if(err) {
			disp.error(err);
		}else{
			disp.log("No chat log template found. Creating default.");
		}
	});
}
var Settings = regSettings('logServer',{
	// Port to run the server on
	port: 9002,
	// How quickly to check if the port is in use
	check_interval: 1000,
	// how many times to check before failing to start
	check_timeout: 10
});
listen(/^.+/i,function(match,data,replyTo,connection){
	var nick,
		data2,
		type='privmsg',
		d = new Date();
	if(replyTo===null&&!/^:([^!]+)!.*(PRIVMSG|NOTICE) ([^ ]+) :(.+)$/i.test(data)){
		replyTo = "- server -";
	}else{
		try{
			data2 = /^:([^!]+)!.*(PRIVMSG|NOTICE) ([^ ]+) :(.+)$/i.exec(data);
			nick = data2[1];
			type = data2[2].toLowerCase();
			if(type=='notice'){
				replyTo = data2[3].trim().toLowerCase();
			}
			data = data2[4];
			if(nick.toLowerCase() == 'omnomirc'){
				if((data2 = (/\([#OC]\)[\W0-9]*<(.+)>(.+)$/).exec(data)) !== null){
					nick = data2[1];
					data = data2[2].trim();
				}else if((data2 = (/\([#OC]\)[\W0-9]* ?(.+) has left .+$/).exec(data)) != null){
					save(connection.config.host+" "+connection.config.port+"/"+replyTo+"/"+d.toDateString(),{
						user: data2[1],
						type: 'part'
					});
					return;
				}else if((data2 = (/\([#OC]\)[\W0-9]* ?(.+) has joined .+$/).exec(data)) != null){
					save(connection.config.host+" "+connection.config.port+"/"+replyTo+"/"+d.toDateString(),{
						user: data2[1],
						type: 'join'
					});
					return;
				}else if((data2 = (/\([#OC]\)[\W0-9]*\*(.+)$/).exec(data)) !== null){
					save(connection.config.host+" "+connection.config.port+"/"+replyTo+"/"+d.toDateString(),{
						msg: data2[1],
						type: 'action',
						user: ''
					});
					return;
				}else{
					console.log('Invalid OmnomIRC Catch: ',JSON.stringify(data2));
				}
			}
			replyTo = replyTo.trim().toLowerCase();
		}catch(e){
			disp.error(e)
			disp.log("Defaulting to '- server -' replyTo");
			replyTo = "- server -";
		}
	}
	var p = connection.config.host+" "+connection.config.port+"/"+replyTo+"/"+d.toDateString();
	if(replyTo == "- server -" && (new RegExp("^:(.+) 372 "+connection.config.nick+" :(.+)$")).exec(data) === null){
		save(p,{
			msg: ">>>	"+data,
			type: type
		});
	}else if(data.indexOf("\x01ACTION ")!=-1){
		save(p,{
			msg: data.substr(data.indexOf("\x01ACTION ")+8,data.length-9),
			user: nick,
			type: 'action'
		});
	}else{
		save(p,{
			msg: data,
			user: nick,
			type: type
		});
	}
});
listen(/^:([^!]+).*PART ([^ ]+) :$/i,function(match,data,replyTo,connection){
	replyTo = match[2].substr(1).trim().toLowerCase();
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		user: match[1],
		type: 'part'
	});
});
listen(/^:([^!]+).*JOIN :([^ ]+)$/i,function(match,data,replyTo,connection){
	replyTo = match[2].substr(1).trim().toLowerCase();
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		type: 'join',
		user: match[1]
	});
});
listen(/^:([^!]+).*KICK \#(\w+) (\w+) :([^ ]+)$/i,function(match,data,replyTo,connection){
	replyTo = match[2].trim().toLowerCase();
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		type: 'kick',
		user: match[3],
		op: match[1],
		msg: match[4]
	});
});
reply_listen(function(replyTo,msg,connection){
	if(replyTo===null){
		replyTo = "- server -";
	}else{
		replyTo = replyTo.trim().toLowerCase();
	}
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/#"+replyTo+"/"+d.toDateString(),{
		msg: msg,
		user: connection.config.nick
	});
});
send_listen(/^.+/i,function(match,msg,connection){
	var d = new Date();
	save(connection.config.host+" "+connection.config.port+"/- server -/"+d.toDateString(),{
		msg: "<<<	"+msg
	});
});
hook('quit',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connection Quit*"
	});
});
hook('reconnect',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Reconnected*"
	});
});
hook('connect',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connected*"
	});
});
hook('timeout',function(){
	var d = new Date();
	save(this.config.host+" "+this.config.port+"/- server -/"+d.toDateString(),{
		msg: "*Connection Timeout*"
	});
});
disp.alert("Starting Log Server");
function addZero(num){
	return (String(num).length < 2) ? num = String("0" + num) :  num = String(num);
}
function save(log,o){
	fs.mkdirParent('data/logs/'+path.dirname(log));
	var d = new Date(),n = {};
	if(typeof o.type === 'undefined'){
		n.type = 'privmsg';
	}else{
		n.type = o.type;
	}
	if(typeof o.user === 'undefined'){
		n.user = '- server -';
	}else{
		n.user = o.user;
	}
	if(typeof o.msg !== 'undefined'){
		n.msg = o.msg;
	}
	if(typeof o.op !== 'undefined'){
		n.op = o.op;
	}
	n.date = d.getTime()+d.getTimezoneOffset()*60*1000;
	switch(config.logtype){
		case 'listdb':
				var l = listdb.getDB('logs/'+log);
				l.add(JSON.stringify(n));
				break;
		case 'txt': default:
			switch(n.type){
				case 'part':
					n.msg = "* "+n.user+" has left the channel";
					break;
				case 'join':
					n.msg = "* "+n.user+" has joined the channel";
					break;
				case 'action':
					n.msg = "* "+n.user+" "+n.msg;
					break;
				default:
					n.msg = "<"+n.user+">	"+n.msg;
			}
			fs.createWriteStream('data/logs/'+log+'.log',{
				flags: 'a',
				encoding: 'ascii'
			}).end("["+d.getHours()+":"+addZero(d.getMinutes())+":"+addZero(d.getSeconds())+"] "+n.msg);
	}
}
function htmlEntities(str){
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\s/g,'&nbsp;');
}
var count = 0,
	server = global.logServer = http.createServer(function (req, res) {
		function check(d){
			try{
				return fs.statSync(d).isDirectory();
			}catch(er){
				return false;
			}
		}
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress, ext,url = require('url').parse(req.url,true);
		switch(config.logtype){
			case 'listdb':
				ext = '.db';
				break;
			case 'txt': default:
				ext = '.log';
		}
		disp.log("Serving "+req.url+" to: "+ip);
		if(req.url == '/'){
			res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8','Server': 'NodeBot/Logs'});
			res.write("<!doctype html><html><head><link rel='icon' type='image/x-icon' href='favicon.ico' /><title>Logs</title><script src='http://code.jquery.com/jquery-1.10.2.min.js'></script>\<script src='http://code.jquery.com/ui/1.10.3/jquery-ui.min.js'></script><link rel='stylesheet' href='http://code.jquery.com/ui/1.9.2/themes/base/jquery-ui.css' type='text/css'>");
			res.write("<script>$(function(){$('.accordion').accordion();$('.datepicker').datepicker({dateFormat:'D M dd yy',maxDate: new Date}).datepicker('setDate','0');$('.open').click(function(){location = '?server='+$(this).prev().prev().prev().val()+'&channel='+$(this).prev().prev().val().substr(1)+'&date='+$(this).prev().val();})})</script>");
			res.write("</head><body><div class='accordion'>");
			var logs = fs.readdirSync('data/logs/');
			if(logs){
				var i,j,f;
				for (i = 0; i < logs.length; i++){
					if(check('data/logs/'+logs[i])){
						var logdirs = fs.readdirSync('data/logs/'+logs[i]);
						if(logdirs && (logdirs.length != 1 || logdirs[0] != '- server -')){
							res.write('<h3>'+logs[i]+'</h3><div><input type="hidden" value="'+logs[i]+'"/><select>');
							for (j = 0; j < logdirs.length; j++){
								if(
									check('data/logs/'+logs[i]+'/'+logdirs[j])
									&& logdirs[j] != '- server -'
									&& logdirs[j].substr(0,1) == '#'
								){
									res.write('<option value="'+logdirs[j]+'">'+logdirs[j]+'</option>');
								}
							}
							res.write('</select><input class="datepicker"/><button class="open" value="Open">Open</button></div>');
						}
					}
				}
			}
			res.end("</div></body></html>");
		}else if(req.url == '/favicon.ico'){
			fs.readFile('data/favicon.ico', "binary", function (err,file) {
				if (err) {
					res.writeHead(500, {'Content-Type':'image/x-icon','Server':'NodeBot/Logs'});
					res.write(err+"");
					res.end();
					return;
				}
				res.writeHead(200,{'Content-Type':'image/x-icon','Server':'NodeBot/Logs'});
				res.write(file, "binary");
				res.end();
			});
		}else{
			var log = url.query,e,m,i,l,n,td,d = new Date();
			if(log.date == 'today'){
				n = d.toDateString();
			}else{
				n = log.date;
			}
			switch(config.logtype){
				case 'listdb':
					if(log.type == 'json'){
						res.writeHead(200, {'Content-Type': 'application/json;','Server': 'NodeBot/Logs'});
						try{
							res.end(fs.readFileSync('data/logs/'+log.server+'/#'+log.channel+'/'+n+ext,'ascii'));
						}catch(e){
							res.end("\"Error opening log: "+log.server+'/#'+log.channel+'/'+n+ext+'"');
						}
					}else{
						res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8','Server': 'NodeBot/Logs'});
						l = listdb.getDB('logs/'+log.server+'/#'+log.channel+'/'+n).getAll();
						res.write('<html><head><title>'+log.server+' #'+log.channel+' '+n+'</title><script src="http://code.jquery.com/jquery-1.10.2.min.js"></script></head><body><a name="start"></a><h1>Server: '+log.server+'</h1><h2>Channel: #'+log.channel+'</h2><h3>Date: '+n+'</h3>');
						res.write('<button value="<- Back" onclick="location=window.location.protocol+\'//\'+window.location.host;"><- Back</button><button value="Bottom" onclick="location.hash=\'end\'">Bottom</button><br/>');
						for(i in l){
							try{
								e = JSON.parse(l[i]);
								var end = '';
								e.msg = htmlEntities((typeof e.msg != 'undefined'?e.msg:'')).replace(/[\x02\x1f\x16\x0f]|\x03(\d{0,2}(?:,\d{0,2})?)/g,function(m){
									var style="",colour,background,type=m[0];
									switch(type){
										case "\x0f":
											type = "\x03";
											style="text-decoration:none;font-weight:normal;text-decoration:none;";
											colour=1; // black
											background=0; //white
										break;
										case "\x1f":
											type = "\x03";
											style="text-decoration:underline;";
										break;
										case "\x02":
											type="\x03";
											style="font-weight:bold;";
										break;
										case "\x03":
											colour=m[1];
											if(/\d/.test(m[2])){
												colour+=m[2];
												if(m[3] == ','){
													background = m[4];
													if(/\d/.test(m[5])){
														background+=m[5];
													}
												}
											}else if(m[2] == ','){
												background = m[3];
												if(/\d/.test(m[4])){
													background+=m[4];
												}
											}
										break;
									}
									if(type == "\x03"){
										var getColour = function(num,def){
											var c=def;
											// Reference: http://www.mirc.com/colors.html
											switch(parseInt(num)){
												// 0 white
												case 0:c='white';break;
												// 1 black
												case 1:c='black';break;
												// 2 blue (navy)
												case 2:c='blue';break;
												// 3 green
												case 3:c='green';break;
												// 4 red
												case 4:c='red';break;
												// 5 brown (maroon)
												case 5:c='brown';break;
												// 6 purple
												case 6:c='purple';break;
												// 7 orange (olive)
												case 7:c='orange';break;
												// 8 yellow
												case 8:c='yellow';break;
												// 9 light green (lime)
												case 9:c='lime';break;
												// 10 teal (a green/blue cyan)
												case 10:c='teal';break;
												// 11 light cyan (cyan) (aqua)
												case 11:c='aqua';break;
												// 12 light blue (royal)
												case 12:c='royalblue';break;
												// 13 pink (light purple) (fuchsia)
												case 13:c='fuchsia';break;
												// 14 grey
												case 14:c='grey';break;
												// 15 light grey (silver)
												case 15:c='silver';break;
											}
											return c;
										};
										end += '</span>';
										return "<span style='color:"+getColour(colour,'inherit')+";background-color:"+getColour(background,'transparent')+";display:inline-block;"+style+"'>";
									}
									return '';
								}).trim();
								e.msg += end;
								e.user = htmlEntities(e.user);
								switch(e.type){
									case 'join':
										m = '<strong>*'+e.user+' joined the channel</strong>';
									break;
									case 'part':
										m = '<strong>*'+e.user+' left the channel</strong>';
									break;
									case 'privmsg':
										m = '&lt;	<strong>'+e.user+'</strong>	&gt;	'+e.msg;
									break;
									case 'notice':
										m = '<em>&lt;	<strong>'+e.user+'</strong>	&gt;	'+e.msg+'</em>';
									break;
									case 'action':
										m = '<strong>*'+(' '+e.user+' '+e.msg).replace('&nbsp;',' ').trim().replace(' ','&nbsp;')+'</strong>';
									break;
									case 'kick':
										m = '<strong>* '+e.op+' kicked '+e.user+' from the channel ('+e.msg+')</strong>';
									break;
									default:
										m = 'error! '+e.type;
								}
								td = new Date(e.date);
								res.write("<div class='log-entry'><a href=\"?server="+log.server+"&channel="+log.channel+"&date="+n+"#"+e.date+'" name="'+e.date+'">'+'['+addZero(td.getUTCHours())+':'+addZero(td.getUTCMinutes())+':'+addZero(td.getUTCSeconds())+']</a>'+m+"</div>");
							}catch(e){
								disp.log("Invalid character in log "+e);
								res.write("*Please contact the owner of this bot. The logs have invalid characters*<br/>");
							}
						}
						res.end('<button value="<- Back" onclick="location=window.location.protocol+\'//\'+window.location.host;"><- Back</button><button value="Top" onclick="location.hash=\'start\'">Top</button><a name="end"></a>'+"\n"+'<script>$(".log-entry").each(function(){this.innerHTML = this.innerHTML.replace("&nbsp;"," ").replace(/(\\b(https?|ftps?|file|irc):\\/\\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig,"<a href='+"'$1'"+'>$1</a>").replace(" ","&nbsp;");});</script></body></html>');
					}
				break;
				case 'txt': default:
					res.writeHead(200, {'Content-Type': 'text/plain;','Server': 'NodeBot/Logs'});
					try{
						res.end(fs.readFileSync('data/logs/'+log.server+'/#'+log.channel+'/'+n+ext,'ascii'));
					}catch(e){
						res.end("Error opening log: "+log.server+'/#'+log.channel+'/'+n+ext);
					}
			}
		}
	}).listen(Settings.port);
server.on("close",function(){
	disp.alert("Ending Log Server");
});
server.on('error',function(e){
	if(e.code == 'EADDRINUSE'){
		setTimeout(function(){
			if(count < Settings.check_timeout){
				count++;
				disp.log("Port "+Settings.port+" in use, reconnect attempt: "+count);
				try{
					server.close();
				}catch(e){}
				server.listen(Settings.port);
			}else{
				count = 0;
				disp.log('Port in use, stopping');
			}
		},Settings.check_interval);
	}else{
		disp.trace();
		disp.error(e);
	}
});
hook('unload',function(){
	try{
		server.close();
		global.logServer = null;
		addZero = null;
		save = null;
		htmlEntities = null;
	}catch(e){
		disp.alert("Log Server Already Ended");
	}
});
disp.alert("Logging enabled");