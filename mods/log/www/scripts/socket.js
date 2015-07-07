(function(global,undefined){
	global.Socket = function(url,protocols){
			var self = this,
				ws,i,
				onopen = [],
				onmessage = [],
				onerror = [],
				onclose = [],
				stack = function(stack,self,args){
					for(var i in stack){
						try{
							stack[i].apply(self,args);
						}catch(e){
							console.error(e);
						}
					}
				},
				props = [
					'protocol',
					'readyState',
					'url',
					'extensions',
					'bufferedAmount',
					'binaryType'
				],
				prop = function(name){
					Object.defineProperty(self,name,{
						get: function(){
							return ws===undefined?undefined:ws[name];
						}
					});
				};
			for(i in props){
				prop(props[i]);
			}
			self.open = function(fn){
				if(fn!==undefined){
					onopen.push(fn);
				}else{
					if(ws!==undefined){
						ws.close();
					}
					try{
						ws = new WebSocket(url,protocols);
						ws.onopen = function(){
							stack(onopen,this,arguments);
						};
						ws.onmessage = function(msg){
							stack(onmessage,this,arguments);
						};
						ws.onerror = function(){
							stack(onerror,this,arguments);
						};
						ws.onclose = function(){
							stack(onclose,this,arguments);
						};
					}catch(e){
						console.error(e);
					}
				}
				return self;
			};
			self.message = function(fn){
				if(fn instanceof Function){
					onmessage.push(fn);
				}else{
					stack(onerror,this,arguments);
				}
				return self;
			};
			self.error = function(fn){
				if(fn instanceof Function){
					onerror.push(fn);
				}else{
					stack(onerror,this,arguments);
				}
				return self;
			};
			self.close = function(fn){
				if(fn instanceof Function){
					onclose.push(fn);
				}else{
					ws.close.apply(ws,arguments);
				}
				return self;
			};
			self.send = function(msg){
				ws.send.apply(ws,arguments);
			};
			return self;
	};
	global.socket = {
		create: function(url,protocol){
			return new Socket(url,protocol);
		}
	};
})(window);