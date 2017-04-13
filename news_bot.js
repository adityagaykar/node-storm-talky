var storm = require('node-storm')
var q = require('q')
var requestify = require("requestify");
var firebase = require('firebase')
var Request = require('request');
var rssReader = require('feed-read')
var news_endpoint = "http://www.hindustantimes.com/rss/topnews/rssfeed.xml"

var getClassifierUrl = function(){
	return "http://slave1:8000/api/default/classify";
}

var BOT_KEY = "news"

firebase.initializeApp({
  databaseURL: "https://marcefirebasechat-57189.firebaseio.com"
});
var db = firebase.database()

var readRequest = (function (){
	var setListener = true
	return (		
		storm.spout(function(sync) {			
			var self = this										
			if(setListener){
				setListener = false			
				var getClassifierResult = function(word, callback){
					var url = getClassifierUrl()				
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
				var ref = db.ref("/")
				ref.on("child_added", function(record, prevKey){
					record.ref.limitToLast(1).on("child_added",function(snapshot, prevKey){
						if(snapshot.child("botbutton").val() == "True"){
							var process = snapshot.child("process").val();							
							if(process == "Not Done"){								
								var news_request=snapshot.ref.path.toString();
								var msg = snapshot.child("message").val();																		
								getClassifierResult(msg, function(err, result){
									if( err == null && result == BOT_KEY){
										snapshot.ref.update({
											process : "Task : added bot key",
											bot : BOT_KEY
										})	
										self.emit([news_request]);
										sync();									
									}
								})																												
							}
						}
					});				
				})		

				var group_ref = db.ref("/groups")
				group_ref.on("child_added", function(record, prevKey){
					var message_child = record.child("message")
					message_child.ref.limitToLast(1).on("child_added",function(snapshot, prevKey){
						if(snapshot.child("botbutton").val() == "True"){
							var process = snapshot.child("process").val();							
							if(process == "Not Done"){								
								var news_request=snapshot.ref.path.toString();
								var msg = snapshot.child("message").val();																		
								getClassifierResult(msg, function(err, result){
									if( err == null && result == BOT_KEY){
										snapshot.ref.update({
											process : "Task : added bot key",
											bot : BOT_KEY
										})	
										self.emit([news_request]);
										sync();									
									}
								})																												
							}
						}
					});				
				})				
			}						
			setTimeout(function() {
				//just wait		
				sync()				
			}, 100)
		}).declareOutputFields(["news_request"])
	)
})()

var getRSSFeed = (function (){
	return (
		storm.basicbolt(function(data) {
			var request = data.tuple[0]
			var ref = db.ref(request)	
			var self = this
			ref.update({
				process: "getRSSFeed"
			})
			var getArticles = function(callback){
				rssReader(news_endpoint, function(err, articles){
					if(err){
						callback(err)
					} else {
						if(articles.length > 0){
							callback(null, articles)							
						} else {
							callback("<br/>No articles received")
						}
					}
				})
			}
			var payload = "test"			
			if(request != null)	{					
				getArticles(function(err, articles){															
					var ref = db.ref(request)		
					if(!err){
						ref.update({
							process: "getRSSFeedEmit " + JSON.stringify(articles)
						})	
						payload = "News Headlines from hindustantimes"
						for(article of articles){
							payload += '<br/><br/><a href="'+article.link+'">'+article.title+"<a/>"	
						}											
						ref.parent.push().set({
							message : payload,
							name : "NewsBot",
							sender : "newsbot-id"
						})															
					} else {
						ref.parent.push().set({
							message : "ops, something went wrong sorry!",
							name : "NewsBot",
							sender : "newsbot-id"
						})															
					}	
					
				})
			}		
			self.emit([request, payload])																	
		}).declareOutputFields(["request","payload"])
	)
})()

var builder = storm.topologybuilder()
builder.setSpout('news_request', readRequest)
builder.setBolt('getRSSFeed', getRSSFeed, 2).shuffleGrouping('news_request')

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

