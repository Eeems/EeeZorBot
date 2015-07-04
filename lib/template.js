var cache = {},
	fs = require('fs'),
	template = function(path){
		if(!cache[path]){
			if(!fs.existsSync(path)){
				throw new Error('Template '+path+' does not exist.');
			}
			cache[path] = {
				path: path,
				compile: function(data){
					var re = {
							each: /\{#each ([^}]*)\}([\S\s]*)\{\/each \1\}/gi,
							match: /{([^}\n]+?)}/gi,
							exist: /\{#exist ([^}]*)\}([\S\s]*)\{\/exist \1\}/gi,
							existelse: /\{#exist ([^}]*)\}([\S\s]*)\{#else \1\}([\S\s]*)\{\/exist \1\}/gi
						},
						update = function(str,data){
							data = data === null?{}:data;
							return str
								.replace(re.each,function(m,name,substr){
									var i,r = '';
									for(i in data[name]){
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
						};
					return update(this.template,data);
				},
				template: '',
				reload: function(){
					this.template = fs.readFileSync(this.path,{
						encoding: 'utf8'
					});
				}
			};
			fs.watch(path,function(){
				cache[path].reload();
			});
			cache[path].reload();
		}
		return cache[path];
	};
module.exports = template;