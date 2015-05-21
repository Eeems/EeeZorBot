var getrd = function(){
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
};
stdin.add('dns',function(argv){
		var i,
			realdomains = getrd();
		if(argv.length>1){
			var d;
			for(i=1;i<argv.length;i++){
				d = argv[i];
				if(api.caches.realdomains[d]===undefined){
					stdin.console('log',d+' isdomain: '+realdomains[d]);
				}else{
					stdin.console('log',d+' isdomain: unknown');
				}
			}
		}else{
			var c=0;
			for(i in realdomains){
				if(realdomains[i]){
					c++;
				}
			}
			stdin.console('log','Cached domain dns: '+c);
		}
	},'Displays cached domain information')
	.add('dnsdump',function(){
		stdin.console('log',getrd());
	},'dumps the dns cache');
script.unload = function(){
	for(var i in servers){
		servers[i].release(script);
	}
};