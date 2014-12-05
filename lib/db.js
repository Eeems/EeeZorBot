/*jshint multistr: true */
var mysql = require('mysql'),
	deasync = require('deasync'),
	pool = mysql.createPool(
		require('../etc/config.json').mysql
	),
	db = module.exports = {
		exec: function(fn){
			pool.getConnection(function(e,c){
				if(!e){
					fn.exec(c,c);
				}else{
					throw e;
				}
			});
		},
		query: function(){
			pool.query.apply(pool,arguments);
			return db;
		},
		querySync: function(){
			var args = Array.prototype.slice.call(arguments,0),
				sync = true,
				data;
			args.push(function(e,r,f){
				if(e){
					throw e;
				}
				data = r;
				sync = false;
			});
			db.query.apply(db,args);
			while(sync){
				deasync.sleep(1);
			}
			return data;
		},
		// scripts format: 
		// {
		//		script: 'script',
		//		args: [
		//			'argument',
		//			...
		//		],
		//		'script',
		//		...
		// }
		multiQuery: function(scripts,callback){
			(function(scripts,callback){
				var rs = [],
					run = function(i){
						var a = [];
						if(typeof scripts[i] == 'string'){
							a.push(scripts[i]);
						}else{
							a = [scripts[i].script];
							if(scripts[i].args !== undefied){
								a.push(scripts[i].args);
							}
						}
						a.push(function(e,r,f){
							if(e){
								throw e;
							}
							rs.push(r);
							if(i+1<scripts.length){
								run(i+1);
							}else{
								callback.call(null,rs);
							}
						});
						db.query.apply(db,a);
					};
				run(0);
			})(scripts,callback===undefined?function(){}:callback);
		},
		multiQuerySync: function(){
			var args = Array.prototype.slice.call(arguments,0),
				sync = true,
				data;
			args.push(function(r){
				data = r;
				sync = false;
			});
			db.multiQuery.apply(db,args);
			while(sync){
				deasync.sleep(1);
			}
			return data;
		},
		hasIndex: function(table,name,callback){
			callback = callback===undefined?function(){}:callback;
			db.query("\
				SELECT COUNT(1) found\
				FROM INFORMATION_SCHEMA.STATISTICS\
				WHERE table_schema=DATABASE()\
				AND table_name= ?\
				AND index_name= ?\
			",[table,name],function(e,r,f){
				callback.call(null,r[0].found>0);
			});
		},
		hasIndexSync: function(table,name){
			var sync = true,
				data;
			db.hasIndex(table,name,function(v){
				data = v;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			return data;
		},
		createIndex: function(table,name,column,callback){
			callback = callback===undefined?function(){}:callback;
			db.hasIndex(table,name,function(e){
				if(!e){
					db.query("CREATE INDEX "+pool.escapeId(name)+" ON "+pool.escapeId(table)+" ("+pool.escapeId(column)+")",function(e){
						if(e){
							throw e;
						}
						callback.apply(null,arguments);
					});
				}else{
					callback.apply(null,arguments);
				}
			});
		},
		createIndexSync: function(table,name,column){
			var sync = true,
				data;
			db.createIndex(table,name,column,function(){
				data = arguments;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			return data;
		},
		insert: function(table,columns,callback){
			callback = callback===undefined?function(){}:callback;
			db.query("INSERT INTO "+pool.escapeId(table)+" SET ?",[columns],function(e,r,f){
				if(e){
					throw e;
				}
				callback.call(db,r.insertId);
			});
		},
		insertSync: function(table,columns){
			var sync = true,
				data;
			db.insert(table,columns,function(r){
				data = r;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			return data;
		}
	};
