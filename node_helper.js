var request = require('request')
var NodeHelper = require("node_helper")
var zlib = require('zlib')

const BASE_URL = 'http://api.511.org/transit/'

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper: " + this.name);
    },

    socketNotificationReceived: function(query, parameters) {
        var self = this
        console.log("Query: " + query + " Parameters: " + parameters)

        if(query === "CheckForDelays") {
            self.CheckForDelays(parameters)
        } else if(query === "GetStationStatus") {
            self.GetStationStatus(parameters)
        }
    },

    // compare the aimed arrival and expected arrival times to find delays
    CheckForDelaysCallback: function(raw_json) {
        var self = this
        var delayed_trains = []
        json = JSON.parse(raw_json)
        data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
        for (var i = 0, len = data.length; i < len; i++) {
            train = data[i].MonitoredVehicleJourney
            call = train.MonitoredCall
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
        self.sendSocketNotification("CheckForDelays", delayed_trains);
    },

    // returns all reported train statuses for a given station
    GetStationStatusCallback: function(raw_json) {
        var self = this
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
        self.sendSocketNotification("GetStationStatus", station_status);
    },

    getRequest: function(options, callback) {
        var self = this
        request(options, function(err, resp, body) {
            if(!err && resp.statusCode == 200) {
                if(resp.headers['content-encoding'] == 'gzip') {
                    zlib.gunzip(body, function(err, result) {
                        if (err) {
                            console.log("Error gunzipping: ", err)
                        } else {
                            callback(result.toString("utf-8").trim())
                        }
                    })
                }
            } else {
                console.log("request error: ", err, resp.statusCode)
            }
        })
    },

    CheckForDelays: function(parameters) {
        var self = this
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
        data = self.getRequest(options, self.CheckForDelaysCallback)
    },

    GetStationStatus: function(parameters) {
        // This can be inaccurate if the train is not set to arrive soon. It may be
        // good to threshold this somewhere. Perhaps list the upcomming trains but
        // don't display the status until it's close to the station
        var self = this
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
        data = self.getRequest(options, self.GetStationStatusCallback)
    },
})
