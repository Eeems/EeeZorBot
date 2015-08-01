var cache = {},
	folder_cache = {},
	fs = require('fs'),
	path = require('path'),
	tools = require('./tools.js'),
	re = {
		each: /\{#each ([^}]*)\}([\S\s]*)\{\/each \1\}/gi,
		match: /\{([^#\/][^}\n]+?)\}/gi,
		exist: /\{#exist ([^}]*)\}([\S\s]*)\{\/exist \1\}/gi,
		existelse: /\{#exist ([^}]*)\}([\S\s]*)\{#else \1\}([\S\s]*)\{\/exist \1\}/gi,
		ignore: /\{#ignore\}([\S\s]*)\{\/ignore\}/gi,
		ignored: /\{#ignored (\d+?)\}/gi
	},
	update = function(str,data){
		data = data === null?{}:data;
		var ignored = [],
			ret =  str
				.replace(re.ignore,function(m,code){
					return '{#ignored '+ignored.push(code)+'}';
				})
				.replace(re.each,function(m,name,substr){
					var i,r = '';
					for(i=0;i<data[name].length;i++){
						r += update(substr,data[name][i]);
					}
					return r;
				})
				.replace(re.existelse,function(m,name,substr,substr2){
					var r = '';
					if(data[name]){
						r = update(substr,data);
					}else{
						r = update(substr2,data);
					}
					return r;
				})
				.replace(re.exist,function(m,name,substr){
					var r = '';
					if(data[name]){
						r = update(substr,data);
					}
					return r;
				})
				.replace(re.match,function(m,name){
					var r = '';
					if(data[name]){
						r = data[name];
					}
					return r;
				});
		return ret.replace(re.ignored,function(m,i){
			return ignored[parseInt(i,10)-1];
		});
	};
module.exports = {
	template: function(filepath){
		filepath = path.normalize(filepath);
		if(!cache[filepath]){
			if(!fs.existsSync(filepath)){
				throw new Error('Template '+filepath+' does not exist.');
			}
			cache[filepath] = {
				path: filepath,
				file: tools.file.subscribe(filepath),
				compile: function(data){
					data = data === undefined?{}:data;
					return update(this.template,data);
				}
			};
			Object.defineProperty(cache[filepath],'template',{
				get: function(){
					return cache[filepath].file.data;
				}
			});
		}
		return cache[filepath];
	},
	templates: function(folder){
		folder = path.normalize(folder);
		if(!folder_cache[folder]){
			if(!fs.existsSync(folder)){
				throw new Error('Template '+folder+' does not exist.');
			}
			folder_cache[folder] = {
				path: folder,
				folder: tools.folder.subscribe(folder),
				compile: function(filepath,data){
					data = data === undefined?{}:data;
					return update(this.template(filepath),data);
				},
				template: function(filepath){
					return this.folder.file(filepath).data;
				}
			};
		}
		return folder_cache[folder];
	}
};