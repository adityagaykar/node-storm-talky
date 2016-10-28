var rssReader = require('feed-read')
var news_endpoint = "http://www.hindustantimes.com/rss/topnews/rssfeed.xml"

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

setTimeout(function(){
	getArticles(function(err, articles){
		var payload = null
		var request = null
		if(!err)
			payload = [request, articles]
		else
			payload = [request, []]
		for(article of articles)
			console.log(article.title)
	})	
}, 1000)


