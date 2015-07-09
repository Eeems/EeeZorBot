window.template = function(id,data){
	data = data === undefined?{}:data;
	var template = document.getElementById(id).innerHTML,
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
				ret = str
					.replace(re.ignore,function(m,code){
						return '{#ignored '+ignored.push(code)+'}';
					})
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
			return ret.replace(re.ignored,function(m,i){
				return ignored[parseInt(i,10)-1];
			});
		};
	return update(template,data);
};