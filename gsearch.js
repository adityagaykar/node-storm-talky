// var gsearch = (function() {
// 	var links = {}
// 	return storm.basicbolt(function(data) {
// 		var word = data.tuple[0]		
// 	}).declareOutputFields(["word", "links"])
// })()

var storm = require('node-storm')
var q = require('q')
var requestify = require("requestify");
var firebase = require('firebase')
var rssReader = require('feed-read')
var Request = require('request')
var getGoogleUrl = function(word){
	return "https://www.googleapis.com/customsearch/v1?q="+word+"&num=4&cx=008895008702538367069:jp3tqzd1kde&key=AIzaSyDKGN9uMnwTurIsWgz0TTjhJ9aRVUXLcCk";
}

firebase.initializeApp({
  databaseURL: "https://talky-9a224.firebaseio.com"
});
var db = firebase.database()

var readRequest = (function (){
	var setListener = true
	return (		
		storm.spout(function(sync) {			
			var self = this								
			if(setListener){
				setListener = false			
				var ref = db.ref("/")
				ref.on("child_added", function(record, prevKey){
					record.ref.limitToLast(1).on("child_added",function(snapshot, prevKey){
						var isBotTask = snapshot.child("for").val()
						if(isBotTask == "google"){
							var process = snapshot.child("process").val()
							if(process == "not done"){
								var arr = snapshot.child("msg").val();
								arr = arr.trim()
								arr = arr.substring(arr.indexOf("#search"))
								arr = arr.trim()
								var word = "no query"
								if(arr && arr.indexOf(" ") != -1)
									word = arr.substring(arr.indexOf(" ")+1)																
								var request =snapshot.ref.path.toString()				
								if(request != null){
									var search_request = request+"#@#"+word
									self.emit([search_request])							
									var refPath = request
									request = null										
									ref = db.ref(refPath)
									ref.update({
										process : "spout emitted: "+refPath
									})	
									sync()													
								}																																															
							}						
						}
					})	
				})			
			}						
			setTimeout(function() {
				//just wait		
				sync()				
			}, 100)
		}).declareOutputFields(["search_request"])
	)
})()


var getGoogleFeed = (function (){
	return (
		storm.basicbolt(function(data) {
			var tuple = data.tuple[0]
			tuple = tuple.split("#@#")
			var request = tuple[0]
			var word = tuple[1]
			var ref = db.ref(request)	
			var self = this
			ref.update({
				process: "getGoogleFeed "+word+" "+request
			})
			var getGoogleResults = function(word, callback){
				var url = getGoogleUrl(word)
				//requestify.get(url).then(function(response) {
				Request({url: url, json: true}, function(err, response, data){
				    // Get the response body
				    // var data = response.getBody();
				    if(!err){
				    	var items = data.items;				    
				    	if(items){
				    		callback(null, items)
				    	} else {
				    		callback("ops, something went wrong")
				    	}
				    } else {
				    	callback("ops, something went wrong")
				    }				    				    
				});				
			}
			var payload = "test"			
			if(request != null && word != "no query")	{					
				getGoogleResults(word, function(err, results){															
					var ref = db.ref(request)				
					if(err)
						ref.update({
							process: "getGoogleResults " + err
						})							
					ref.update({
						process: "getGoogleResults " + JSON.stringify(results)
					})	
					payload = "I have got some useful links for you :<br/><br/>"
					for(result of results){
						payload += '<br/><br/><a href="'+result.link+'"> - '+result.title+"</a>"						
					}											
					ref.parent.push().set({
						msg : payload,
						name : "GoogleBot"
					})														
				})
			} else {
				var ref = db.ref(request)					
				ref.parent.push().set({
					msg : "Tell me what you are looking for... e.g #google apple",
					name : "GoogleBot"
				})
			}		
			self.emit([request, payload])																	
		}).declareOutputFields(["request","payload"])
	)
})()

var builder = storm.topologybuilder()
builder.setSpout('search_request', readRequest)
builder.setBolt('getGoogleFeed', getGoogleFeed, 2).shuffleGrouping('search_request')

var nimbus = process.argv[2]
var options = {
	config: {'topology.debug': true, 'topology.workers' : 3},
	
}

var topology = builder.createTopology()

if (nimbus == null) {
	var cluster = storm.localcluster()
	cluster.submit(topology, options).then(function() {
		return q.delay(20000)
	}).finally(function() {
		return cluster.shutdown()
	}).fail(console.error)
} else {
	options.nimbus = nimbus
	storm.submit(topology, options).fail(console.error)
}

