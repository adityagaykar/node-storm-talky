var Request = require('request')
var storm = require('node-storm')
var q = require('q')
var firebase = require('firebase')
var apiURL = function(city){
	return "http://api.openweathermap.org/data/2.5/weather?q="+city+"&units=metric&APPID=2eb05fdaeb42f99d947fa21f83a4a279"	
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
						if(isBotTask == "weather"){
							var process = snapshot.child("process").val()
							if(process == "not done"){
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


var extractCityBolt = (function(){	
	return (
		storm.basicbolt(function(data){			
			var msg = data.tuple[0]
			var refPath = data.tuple[1]
			var snapshot = db.ref(refPath)											
			msg = msg.trim()
			var city = "no city"
			if(msg && msg.indexOf(" ") != -1)
				city = msg.substring(msg.indexOf(" ")+1)									
			snapshot.update({
				process : "city extracted: "+city
			})
			this.emit([city, refPath])																																																											
		}).declareOutputFields(["city","refPath"])
	)
})()

var getWeatherFeedBolt = (function (){
	return (
		storm.basicbolt(function(data) {			
			var city = data.tuple[0]
			var refPath = data.tuple[1]
			var ref = db.ref(refPath)	
			var self = this
			ref.update({
				process: "getWeather"
			})
			var getWeather = function(callback){
				Request({url : apiURL(city), json: true}, function(error, response, data){
					if(error){
						callback("error", null)
						return
					}
					if(response.statusCode != 200){
						callback("Response not 200 "+city, null)
					} else {
						callback(null, data)
					}
				})
				// var data = {"coord":{"lon":72.85,"lat":19.01},"weather":[{"id":800,"main":"Clear","description":"clear sky","icon":"01d"}],"base":"stations","main":{"temp":28.97,"pressure":1023.58,"humidity":75,"temp_min":28.97,"temp_max":28.97,"sea_level":1024.17,"grnd_level":1023.58},"wind":{"speed":5.56,"deg":329.003},"clouds":{"all":0},"dt":1478001286,"sys":{"message":0.0136,"country":"IN","sunrise":1477962550,"sunset":1478003691},"id":1275339,"name":"Mumbai","cod":200}
				// callback(null, data)

			}
			if(city != "no city")		
				getWeather(function(err, weatherData){																				
					var ref = db.ref(refPath)					
					ref.update({
						process: "getWeather" + JSON.stringify(weatherData)
					})															
					if(weatherData){
						var node = ref.parent.push()
						var condition = weatherData.weather[0].description
						var temp = weatherData.main.temp
						node.set({
							msg : "The weather in "+city+" is "+temp+" and "+condition,
							name : "WeatherBot"
						})	
					} else {
						var node = ref.parent.push()
						node.set({
							msg : "ops, sorry something went wrong :( "+err,
							name : "WeatherBot"
						})	
					}
					ref.update({
						process : "done"
					})	
													
				})
			else {
				var node = ref.parent.push()
				node.set({
					msg : "Hey! let me know the city name, e.g #weather Mumbai",
					name : "WeatherBot"
				})
			}

			var payload = city
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
	config: {'topology.debug': false, 'topology.workers' : 2},
	
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