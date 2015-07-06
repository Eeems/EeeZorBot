window.onload = function(){
	NodeList.prototype.forEach = Array.prototype.forEach;
	document.querySelector('#controls>span.right>a.reload').onclick = function(){
		location.reload();
	};
};