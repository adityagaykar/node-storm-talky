var Request = require('request')
var storm = require('node-storm')
var q = require('q')
var firebase = require('firebase')
var apiURL = function(city){
	return "http://api.openweathermap.org/data/2.5/weather?q="+city+"&units=metric&APPID=2eb05fdaeb42f99d947fa21f83a4a279"	
}
var getClassifierUrl = function(){
	return "http://slave1:8000/api/default/classify";
}

var getWeatherServiceUrl = function(){
	return "http://slave1:7000/api/v1/invoke"
}
var API_ACCESS_TOKEN = "acb1ddfa0835d824b560824506246a43d699fcd5d77b063d3005272e9eb6ba03"
var BOT_KEY = "weather"

firebase.initializeApp({
  databaseURL: "https://marcefirebasechat-57189.firebaseio.com"
});

var db = firebase.database()

	
var botTaskSpout = (function (){
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
								var refPath=snapshot.ref.path.toString();
								var msg = snapshot.child("message").val();																		
								getClassifierResult(msg, function(err, result){
									if( err == null && result == BOT_KEY){
										snapshot.ref.update({
											process : "Task : added bot key",
											bot : BOT_KEY
										})	
										self.emit([msg,refPath]);
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
								var refPath=snapshot.ref.path.toString();
								var msg = snapshot.child("message").val();																		
								getClassifierResult(msg, function(err, result){
									if( err == null && result == BOT_KEY){
										snapshot.ref.update({
											process : "Task : added bot key",
											bot : BOT_KEY
										})	
										self.emit([msg,refPath]);
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
		}).declareOutputFields(["msg", "refPath"])
	)
})()


var extractCityBolt = (function(){	
	return (
		storm.basicbolt(function(data){			
			var msg = data.tuple[0]
			var refPath = data.tuple[1]
			var city = msg
			this.emit([city, refPath])																																																											
		}).declareOutputFields(["city","refPath"])
	)
})()

var getWeatherFeedBolt = (function (){
	return (
		storm.basicbolt(function(data) {			
			var msg = data.tuple[0]
			var refPath = data.tuple[1]
			var ref = db.ref(refPath)	
			var self = this
			ref.update({
				process: "getWeather"
			})
			var getWeather = function(message,callback){
				var url = getWeatherServiceUrl()				
				Request({
					headers: {'content-type' : 'application/json'},
				    url:     url,
				    body:    '{"access_token" : "'+API_ACCESS_TOKEN+'", "message" : "'+message+'"}'						    
				}, 
				function(err, response, data){				
				    if(!err){				    	
				    	if(data){
				    		callback(null, data)
				    	} else {
				    		callback("ops, something went wrong")
				    	}
				    } else {
				    	callback("ops, something went wrong")
				    }				    				    
				});
				// var data = {"coord":{"lon":72.85,"lat":19.01},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01d"}],"base":"stations","main":{"temp":28.97,"pressure":1023.58,"humidity":75,"temp_min":28.97,"temp_max":28.97,"sea_level":1024.17,"grnd_level":1023.58},"wind":{"speed":5.56,"deg":329.003},"clouds":{"all":0},"dt":1478001286,"sys":{"message":0.0136,"country":"IN","sunrise":1477962550,"sunset":1478003691},"id":1275339,"name":"Mumbai","cod":200}
				// callback(null, data)

			}
			if(msg != null)		
				getWeather(msg,function(err, weatherData){																				
					var ref = db.ref(refPath)					
					ref.update({
						process: "getWeather" + weatherData
					})															
					if(weatherData){	
						var node = ref.parent.push()
						weatherData = weatherData.replace(/"/g, "")					
						node.set({
							message : weatherData,
							name : "WeatherBot",
							sender : "weatherbot-id"
						})	
					} else {
						var node = ref.parent.push()
						node.set({
							msg : "ops, sorry something went wrong :( "+err,
							name : "WeatherBot",
							sender : "weatherbot-id"
						})	
					}
					ref.update({
						process : "done"
					})	
													
				})
			else {
				var node = ref.parent.push()
				node.set({
					message : "Hey! let me know the city name, e.g #weather Mumbai",
					name : "WeatherBot",
					sender : "weatherbot-id"
				})
			}

			var payload = msg
			self.emit([payload])
		}).declareOutputFields(["payload"])
	)
})()

var builder = storm.topologybuilder()
builder.setSpout('botTaskSpout', botTaskSpout)
builder.setBolt('extractCityBolt', extractCityBolt, 2).shuffleGrouping('botTaskSpout')
builder.setBolt('getWeatherFeedBolt', getWeatherFeedBolt, 2).fieldsGrouping('extractCityBolt',['city'])

var nimbus = process.argv[2]
var options = {
	config: {'topology.debug': false, 'topology.workers' : 1},
	
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