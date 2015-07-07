window.onload = function(){
	NodeList.prototype.forEach = Array.prototype.forEach;
	document.querySelector('#controls>span.right>a.reload').onclick = function(){
		location.reload();
	};
	if(todayDate == thisDate){
		var ws = socket.create('ws://'+location.hostname+':9004');
		ws.open(function(e){
				console.log('Connected to websocket');
			})
			.close(function(e){
				console.error(e);
			})
			.message(function(e){
				var d = JSON.parse(e.data);
				switch(d.type){
					case 'pub':
						console.log(data.payload);
					break;
					case 'date':
						ws.close();
					break;
					default:
						console.error('Unimplemented server call '+d.type);
						console.error(d);
				}
			})
			.open();
	}
};