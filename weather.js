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
						if(isBotTask == "weather"){
							var process = snapshot.child("process").val()
							if(process == "not done"){
								var arr = snapshot.child("msg").val();
								arr = arr.trim()
								arr = arr.substring(arr.indexOf("#"))
								arr = arr.trim()
								var city = "no city"
								if(arr && arr.indexOf(" ") != -1)
									city = arr.substring(arr.indexOf(" ")+1)
								//city = encodeURI(city)
								if(process == "not done"){
									var msg = city+"#@#"+snapshot.ref.path.toString()				
									var request = msg;
									if(request != null){	
										self.emit([request])							
										var refPath = request.split("#@#")[1]
										request = null										
										ref = db.ref(refPath)
										ref.update({
											process : "spout emitted: "+refPath
										})	
										sync()													
									}																																							
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
		}).declareOutputFields(["request"])
	)
})()



var getWeatherFeed = (function (){
	return (
		storm.basicbolt(function(data) {
			var request = data.tuple[0]		
			var city = request.split("#@#")[0]
			var refPath = request.split("#@#")[1]
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
			if(request != null && city != "no city")		
				getWeather(function(err, weatherData){															
					var payload = refPath+"#@#"+JSON.stringify(weatherData)					
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

			var payload = "test"
			self.emit([payload])
		}).declareOutputFields(["payload"])
	)
})()

var builder = storm.topologybuilder()
builder.setSpout('request', readRequest)
builder.setBolt('getWeatherFeed', getWeatherFeed, 2).shuffleGrouping('request')

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