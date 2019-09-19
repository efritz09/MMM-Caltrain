// run using node test.js
// npm install request

const request = require("request");
const zlib = require('zlib');
const BASE_URL = 'http://api.511.org/transit/';

console.log("checkpoint! 0");

function CheckForDelaysCallback(data) {
	console.log(data);
}

function gunzip(raw, callback) {
	console.log("gunzipping");
	zlib.gunzip(raw, function(err, result) {
		if (err) {
			console.log("Error gunzipping: ", err);
		} else {
			console.log("checkpoint! 4");
			callback(result.toString());
		}
	});
}

function getRequest(options, callback) {
	request(options, function(err, resp, body) {
		if(!err && resp.statusCode == 200) {
			if(resp.headers['content-encoding'] == 'gzip') {
				console.log("gunzipping")
				data = gunzip(body, callback);
				console.log("checkpoint! 3");
			}
		} else {
			console.log("request error: ", err, resp.statusCode);
		}
	})
}


function CheckForDelays() {
	options = {
	    url: BASE_URL + 'StopMonitoring',
	    method: 'GET',
	    encoding: null,
	    qs: {
	        'agency': 'CT',
	        'stopCode': '',
	        'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d',
	    }
	}
	console.log("checkpoint! 1");
	data = getRequest(options, CheckForDelaysCallback);
	console.log("checkpoint! 2");
}

CheckForDelays();
