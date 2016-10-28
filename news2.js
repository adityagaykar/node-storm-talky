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
// var spoutKeyPrev = null
// var spoutKeyCurr = null


var readRequest = (function (){

	return (
		storm.spout(function(sync) {
			var self = this
			var ref = db.ref("/")	
			var request = null
			ref.on("child_added", function(record, prevKey){
				record.ref.limitToLast(1).on("child_added",function(snapshot, prevKey){
					var isBotTask = snapshot.child("for").val()
					if(isBotTask){
						var process = snapshot.child("process").val()
						if(process != "done"){
							request = snapshot.ref.path.toString()				
							//console.log("request updated : "+request);
							// snapshot.ref.update({
							// 	"process" : "done"
							// })
						}
					}
				})	

			})
			setTimeout(function() {
				//just wait		
				// console.log("request : "+request);
				if(request != null){	
					self.emit([request])	
					ref = db.ref(request)
					ref.update({
						process : "spout emitted "
					})		
					request = null
					sync()
				}							
				sync()						
			}, 1000)
		}).declareOutputFields(["request"])
	)

})()
// var readRequest = storm.basicbolt(function(data) {
// 	var request = data.tuple[0]
// 	getArticles(function(err, articles){
// 		var payload = null
// 		if(!err)
// 			payload = [request, articles]
// 		else
// 			payload = [request, []]
// 		this.emit([payload])		
// 	})
	
// }).declareOutputFields(["payload"])


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
							callback("No articles received")
						}
					}
				})
			}
			if(request != null)		
				getArticles(function(err, articles){					
										
					var payload = request+"#@#"+JSON.stringify(articles)
					
					var ref = db.ref(request)
					
					ref.update({
						process: "getRSSFeedEmit " + JSON.stringify(articles)
					})	
					
					
					
					for(article of articles){
						var node = ref.parent.push()
						node.set({
							msg : article.title,
							name : "NewsBot"
						})	
					}
					ref.update({
						process : "done"
					})	
													
				})
			var payload = "test"
			self.emit([payload])
		}).declareOutputFields(["payload"])
	)
})()

var submitNewsToFirebase = (function (){
	return (
		storm.basicbolt(function(data) {
			var payload = data.tuple[0]
			payload = payload.toString().split("#@#")
			var fbpath = payload[0]
			var articles = payload[1]
			articles = JSON.parse(articles)

			var ref = db.ref(fbpath)
			
			ref.update({
				process : "done"
			})
			for(article of articles){
				ref.parent.push.set({
					msg : article.title,
					name : "NewsBot"
				})	
			}											
			var count = 1
			this.emit([count])
		}).declareOutputFields(["count"])
	)
})() 

var builder = storm.topologybuilder()
builder.setSpout('request', readRequest)
builder.setBolt('getRSSFeed', getRSSFeed, 2).shuffleGrouping('request')
// builder.setBolt('submitNewsToFirebase', submitNewsToFirebase, 2).fieldsGrouping('getRSSFeed', ['payload'])

var nimbus = process.argv[2]
var options = {
	config: {'topology.debug': true, 'topology.workers' : 6},
	
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

// var gsearch = (function() {
// 	var links = {}
// 	return storm.basicbolt(function(data) {
// 		var word = data.tuple[0]		
// 		var url = "https://www.googleapis.com/customsearch/v1?q="+word+"&num=4&cx=008895008702538367069:jp3tqzd1kde&key=AIzaSyDKGN9uMnwTurIsWgz0TTjhJ9aRVUXLcCk";
// 		var curr = this;
// 		requestify.get(url).then(function(response) {
// 		    // Get the response body
// 		    var data = response.getBody();
// 		    var items = data.items;
// 		    if(links[word] == null)
// 		    	links[word] = [];
// 		    for(item of items){
// 		    	links[word].push(item.link);
// 		    }
// 		    curr.emit([word, links])
// 		});				
// 	}).declareOutputFields(["word", "links"])
// })()