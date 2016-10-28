

requestify = require("requestify");
var query = "apple";
var url = "https://www.googleapis.com/customsearch/v1?q="+query+"&num=4&cx=008895008702538367069:jp3tqzd1kde&key=AIzaSyDKGN9uMnwTurIsWgz0TTjhJ9aRVUXLcCk";

requestify.get(url).then(function(response) {
    // Get the response body
    var data = response.getBody();
    //console.log(response);
    var items = data.items;
    for(item of items){
    	console.log(item.link);
    }
});