var firebase = require('firebase')

firebase.initializeApp({
  databaseURL: "https://talky-9a224.firebaseio.com"
});

var db = firebase.database()
var ref = db.ref("/")

ref.on("child_added", function(record, prevKey){
	// console.log("Adding listener to : "+record.key)	
	record.ref.limitToLast(1).on("child_added",function(snapshot, prevKey){
		var isBotTask = snapshot.child("for").val()
		if(isBotTask){
			var process = snapshot.child("process").val()
			if(process == "done"){
				console.log("This chatbot task is done!")
			}
		}
		console.log("test" + snapshot.key)
	})	
})

ref = db.ref("/Bakul")

console.log(ref.parent.push)

console.log("OK"+ " " + ref.path.toString())

setTimeout(function(){ console.log("test")}, 100);

// firebase.initializeApp({
//   serviceAccount: {
//     projectId: "talky-9a224",
//     clientEmail: "storm-service@talky-9a224.iam.gserviceaccount.com",
//     privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfcHWRAeVtzUmz\n+U6hWr/nBkx34LLUtQhwSiAJ/e7QMio9FJxXtoCNkvELnw8c81n1UYx7OPm5HcGk\n2ZOGSlGVeeOWup9KOW4MunR3VOObgDaByPRUUsnorPpJNBUNSG7YW9DmAG7NCM30\n/06ZPjKSCrRgBZ3kMJw7EvNViYJrqOxJadbljPJmqRpId9vwKmfhkGlCjUPom5uh\nU1oAoCMWDf7quWIYi2XEJvQKoBI9D04xCQRtTTGzST3RhiDZ3KKqhD1NhjLWEZNN\nPuBsYnuKNYRXC9IMCAH16B6wsW1p8kG3L9Y7PITKAHfuJWM2RfR1uhqpURE0xaR8\n0bWzkHf7AgMBAAECggEAF8r8gGs8BarA+O6XYVTdlmhGOQ17Imrxm3A0X8lZPhB+\nZScSPbSqcnYfKpDN/JAEOKu2vxy9h3Z9U1B0x3GHwzqxT+kBpF31okig4L32SVpU\nyAFpFLxWDTbjEtGG4riQchEhl3ExF7/cnFcNL6ksesbGLB4qdccbSWWGkpk2sUID\n1CO5TkPQsUV/+aLA/4ZILHiU0CI6e6Bth121ydgBY98w+R6Qq2egtJ78iT6kpm8s\nHL3m6eRBLFfcu0NZxlw6G04yr5eDcyttvNDcMPa6f7iCZsZV/dTP9koDqqt1jwJC\nvPpBqyWc6EOLxxKpWTaJo8U6kgm83vbLLjGZp01QoQKBgQDLVe7MGhgFKNjF01Ao\npgZ5yNaXIv4O2b2h7bNg/7VIBXIoZegx7G1OfBLoFtSkfOwfWmoIHoANSk8Z7qk3\n12XD3iBh34hL1wPSZQvWG2Fkf+6k2Bguz22437Oohz156vygABc2rN/SNbQY5vCz\niCAne2oXWTd40WzZKMOvuiWWjQKBgQDIu//fgAp4d/i2e5NEPomAFfva5k/LDLJj\ndSMH/ORHinfnDcgIOo8QJ7uli9h3kICDBa9UDgL7+pew1wd/Uawm84qLmUgOtqDW\nkwHocw+oaL7OwxgourJs0GuxnZeLWyfX+LgfQfKG3mqhIddiaZHifH0UMHix0Amv\n3sQ2HUDKpwKBgHYiiwbR8jqtLKRizSOQshp3cRWGIw0FvIMj0x/78JrTbyvBaVH4\nBtmehG2LNigK3DSrFwd4kPUnwyVR38atwlY166JxeIJ3faTzSBkw9zioi0ICuqoX\noavTbFHxoOoAeJ2M7++4KKG8ydHd+uKTp/rIXS8LiosLQa45XNfv0n7RAoGBAJMF\n555KiOC9dmQp1K46Y7l14Jbu82iULyBbjkHuf0DK8ZFA7c7hHSHHCFBzQiQoqYfN\npSIadSMb4vi6NhqRtlZ9MG+Y4EcuilU/LTmU9NXzijWkfVBvlfnPGeHovDNsm506\n5Zi3U6xmwZCtWbUR/7D0XyRncC9EYaP3tJyyBl+nAoGANGEXw6g+u5jDXh2v2L5Y\n3qNS8S7d1v36E09GCQZXkP8XsJazpKRcs8SuZ0p28drajPa8/l1YQ7zyxeKZAr9f\nYtihsZN0hNcW6Z7bls0qdC1RkEnCO3idE/Cg0x4DF0FDS+qyltzU/KuoyNaUwnYV\nhQZ47TiOzgtQCEGCeodFkfQ=\n-----END PRIVATE KEY-----\n"
//   },
//   databaseURL: "https://talky-9a224.firebaseio.com"
// });