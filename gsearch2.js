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

var botTaskSpout = (function (){
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
								var process = snapshot.child("process").val()							
								var refPath=snapshot.ref.path.toString()
								var msg = snapshot.child("msg").val()
								snapshot.ref.update({
									process : "Task emitted"
								})
								self.emit([msg,refPath])
								sync()																																																						
							}						
						}
					})	
				})			
			}						
			setTimeout(function() {
				//just wait		
				sync()				
			}, 100)
		}).declareOutputFields(["msg", "refPath"])
	)
})()


var extractQueryBolt = (function(){	
	return (
		storm.basicbolt(function(data){			
			var msg = data.tuple[0]
			var refPath = data.tuple[1]
			var snapshot = db.ref(refPath)											
			msg = msg.trim()
			msg = msg.substring(msg.indexOf("#"))
			msg = msg.trim()
			var query = "no query"
			if(msg && msg.indexOf(" ") != -1)
				query = msg.substring(msg.indexOf(" ")+1)									
			snapshot.update({
				process : "query extracted: "+query
			})
			this.emit([query, refPath])																																																											
		}).declareOutputFields(["query","refPath"])
	)
})()

var getGoogleFeedBolt = (function (){
	return (
		storm.basicbolt(function(data) {			
			var request = data.tuple[1]
			var word = data.tuple[0]
			var ref = db.ref(request)	
			var self = this
			ref.update({
				process: "getGoogleFeed "+word+" "+request
			})
			var getGoogleResults = function(word, callback){
				var url = getGoogleUrl(word)				
				Request({url: url, json: true}, function(err, response, data){				
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
					payload = "I have got some useful links for you :<br/>"
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
builder.setSpout('botTaskSpout', botTaskSpout)
builder.setBolt('extractQueryBolt', extractQueryBolt, 2).shuffleGrouping('botTaskSpout')
builder.setBolt('getGoogleFeedBolt', getGoogleFeedBolt, 2).fieldsGrouping('extractQueryBolt', ['query'])

var nimbus = process.argv[2]
var options = {
	config: {'topology.debug': true, 'topology.workers' : 1},	
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

