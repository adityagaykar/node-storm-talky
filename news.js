var storm = require('node-storm')
var q = require('q')
var requestify = require("requestify");
var firebase = require('firebase')
var rssReader = require('feed-read')
var news_endpoint = "http://www.hindustantimes.com/rss/topnews/rssfeed.xml"

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
						if(isBotTask == "news"){
							var process = snapshot.child("process").val()
							if(process == "not done"){																
								var request =snapshot.ref.path.toString()				
								if(request != null){
									var news_request = request	
									self.emit([news_request])							
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
							msg : payload,
							name : "NewsBot"
						})															
					} else {
						ref.parent.push().set({
							msg : "ops, something went wrong sorry!",
							name : "NewsBot"
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

