var Request = require('request')

var getClassifierUrl = function(){
	return "http://slave1:8000/api/default/classify";
}

var getClassifierResult = function(word, callback){
	var url = getClassifierUrl(word)				
	Request({
			headers: {'content-type' : 'application/json'},
		    url:     url,
		    body:    '{"message" : "'+word+'"}'						    
		}, 
		function(err, response, data){				
		    if(!err){
		    	data = JSON.parse(data)
		    	var item = data.bot;				    
		    	if(item){
		    		callback(null, item)
		    	} else {
		    		callback("ops, something went wrong")
		    	}
		    } else {
		    	callback("ops, something went wrong")
		    }				    				    
		});				
}

getClassifierResult("hello", function(err, result){
	if(err == null && result == "google"){
		console.log("Result : "+result);
	} else {
		console.log(err);
	}
});