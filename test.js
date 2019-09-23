// run using node test.js
// npm install request

// vars to be added later:
// - key
// - delay threshold
// - stops to monitor (how many?)
// stretch:
// - specific trains

const request = require("request")
const zlib = require('zlib')
const http = require('http')
const BASE_URL = 'http://api.511.org/transit/'

const delay_time = 50 // milliseconds
// const delay_time = 10000 // milliseconds

function SomeCallbackHere(data) {
	console.log(data)
}

function run(query, parameters) {
    var options
    if(query === "CheckForDelays") {
        options = BuildCheckForDelays(parameters)
        // CheckForDelays

        // self.CheckForDelays(query, parameters)
    } else if(query === "GetStationStatus") {
        options = BuildGetStationStatus(parameters)
        // self.GetStationStatus(query, parameters)
    }
    console.log(options)

	request(options, function(err, resp, body) {
		if(!err && resp.statusCode == 200) {
			if(resp.headers['content-encoding'] == 'gzip') {
				zlib.gunzip(body, function(err, result) {
					if (err) {
						console.log("Error gunzipping: ", err)
					} else {
						console.log()
						callback(query, result.toString("utf-8").trim())
					}
				})
			}
		} else {
			console.log("request error: ", err, resp.statusCode)
		}
	})
}

function callback(query, raw_json) {
	console.log(raw_json)
    if(query === "CheckForDelays") {
        CheckForDelaysCallback(raw_json)
        // CheckForDelays

        // self.CheckForDelays(query, parameters)
    } else if(query === "GetStationStatus") {
        GetStationStatusCallback(raw_json)
        // self.GetStationStatus(query, parameters)
    }
}

// compare the aimed arrival and expected arrival times to find delays
function CheckForDelaysCallback(raw_json) {
	var delayed_trains = []
	json = JSON.parse(raw_json)
	data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
	for (var i = 0, len = data.length; i < len; i++) {
		train = data[i].MonitoredVehicleJourney
		call = train.MonitoredCall
		console.log(train)
		arrive = Date.parse(call.AimedArrivalTime)
		exp = Date.parse(call.ExpectedArrivalTime)

		if ((exp - arrive) > delay_time) {
			delayed_trains.push({
				train: train.VehicleRef,
				stop: call.StopPointName,
				dir: train.DirectionRef,
				delay: (exp - arrive) / 1000 / 60,
			})
		}
	}
	console.log("CheckForDelaysCallback")
	SomeCallbackHere(delayed_trains)
}

// returns all reported train statuses for a given station
function GetStationStatusCallback(raw_json) {
	station_status = []
	json = JSON.parse(raw_json)
	data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
	for (var i = 0, len = data.length; i < len; i++) {
		train = data[i].MonitoredVehicleJourney
		call = train.MonitoredCall
		arrive = Date.parse(call.AimedArrivalTime)
		exp = Date.parse(call.ExpectedArrivalTime)
		status = (exp - arrive) / 1000 / 60

		station_status.push({
			train: train.VehicleRef,
			delay: status,
			dir: train.DirectionRef,
		})
	}

	console.log("GetStationStatusCallback")
	SomeCallbackHere(station_status)
}

function BuildCheckForDelays() {
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
	return options
}

function BuildGetStationStatus() {
	// This can be inaccurate if the train is not set to arrive soon. It may be
	// good to threshold this somewhere. Perhaps list the upcomming trains but
	// don't display the status until it's close to the station
	options = {
	    url: BASE_URL + 'StopMonitoring',
	    method: 'GET',
	    encoding: null,
	    qs: {
	        'agency': 'CT',
	        'stopCode': '70112',
	        'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d',
	    },
	    headers: {
	    	'Content-Type': 'application/json',
	    }
	}
	return options
}

run("CheckForDelays", "")
// run("GetStationStatus", "")
// CheckForDelays()
// GetStationStatus()
