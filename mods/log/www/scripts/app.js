window.onload = function(){
	NodeList.prototype.forEach = HTMLCollection.prototype.forEach = Array.prototype.forEach;
	document.querySelector('#controls>span.right>a.reload').onclick = function(){
		location.reload();
	};
	if(todayDate == thisDate){
		var ws = socket.create('ws://'+window.socketHost+':'+window.socketPort);
		ws.open(function(e){
				console.log('Connected to websocket');
				ws.send(JSON.stringify({
					type: 'sub',
					channel: window.channel
				}));
			})
			.close(function(e){
				console.error(e);
			})
			.message(function(e){
				var d = JSON.parse(e.data);
				console.log('WEBSOCKET - '+d.type);
				switch(d.type){
					case 'pub':
						var content = document.getElementById('content'),
							scroll = content.scrollHeight === content.scrollTop+content.offsetHeight,
							ll = document.querySelector('#end'),
							div = document.createElement('div');
						div.innerHTML = template('template-message',d.payload);
						div.children.forEach(function(child){
							ll.parentNode.insertBefore(child,ll);
						});
						if(scroll){
							content.scrollTop = content.scrollHeight;
						}
					break;
					case 'datechange':
						ws.close();
					break;
					case 'message':case 'join':case 'quit':case 'part':
					case 'notice':case 'topic':case 'mode':case 'action':
						ws.send(JSON.stringify({
							type: 'get/line',
							id: d.id
						}));
					break;
					default:
						console.error('Unimplemented server call '+d.type);
						console.error(d);
				}
			})
			.open();
	}
};