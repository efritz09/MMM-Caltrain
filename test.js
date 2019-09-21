// run using node test.js
// npm install request

// vars to be added later:
// - key
// - delay threshold
// - stops to monitor (how many?)
// stretch:
// - specific trains

const request = require("request");
const zlib = require('zlib');
const http = require('http')
const BASE_URL = 'http://api.511.org/transit/';

const delay_time = 5000; // milliseconds
// const delay_time = 10000; // milliseconds

function SomeCallbackHere(data) {
	console.log(data);
}

// compare the aimed arrival and expected arrival times to find delays
function CheckForDelaysCallback(raw_json) {
	var delayed_trains = [];
	json = JSON.parse(raw_json)
	data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
	for (var i = 0, len = data.length; i < len; i++) {
		train = data[i].MonitoredVehicleJourney
		call = train.MonitoredCall
		arrive = Date.parse(call.AimedArrivalTime)
		exp = Date.parse(call.ExpectedArrivalTime)

		if ((arrive - exp) > delay_time) {
			delayed_trains.push({
				train: train.VehicleRef,
				stop: call.StopPointName,
				dir: train.DirectionRef,
				delay: (arrive - exp) / 1000,
			})
		}
	}

	SomeCallbackHere(delayed_trains);
}

function getRequest(options, callback) {
	request(options, function(err, resp, body) {
		if(!err && resp.statusCode == 200) {
			if(resp.headers['content-encoding'] == 'gzip') {
				zlib.gunzip(body, function(err, result) {
					if (err) {
						console.log("Error gunzipping: ", err);
					} else {
						callback(result.toString("utf-8").trim());
					}
				})
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
	    },
	    headers: {
	    	'Content-Type': 'application/json',
	    }
	}
	data = getRequest(options, CheckForDelaysCallback);
}

CheckForDelays();
