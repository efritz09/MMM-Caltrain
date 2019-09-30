var request = require('request')
var NodeHelper = require("node_helper")
var zlib = require('zlib')

const BASE_URL = 'http://api.511.org/transit/'

// TODO: abstract this
const delay_time = 5000 // milliseconds

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper: " + this.name);
    },

    socketNotificationReceived: function(query, parameters) {
        var self = this
        console.log("Query: " + query + " Parameters: " + parameters)
        var options
        if(query === "CheckForDelays") {
            options = self.buildCheckForDelays(parameters)
        } else if(query === "GetStationStatus") {
            options = self.buildGetStationStatus(parameters)
        } else if (query === "GetDaySchedule") {
            options = self.buildGetDaySchedule(parameters)
        }

        request(options, function(err, resp, body) {
            if(!err && resp.statusCode == 200) {
                if(resp.headers['content-encoding'] == 'gzip') {
                    zlib.gunzip(body, function(err, result) {
                        if (err) {
                            console.log("Error gunzipping: ", err)
                        } else {
                            requestHandler(query, result.toString("utf-8").trim())
                        }
                    })
                }
            } else {
                console.log("request error: ", err, resp.statusCode)
            }
        })
    },

    requestHandler(query, data) {
        if(query === "CheckForDelays") {
            self.checkForDelaysCallback(data)
        } else if(query === "GetStationStatus") {
            self.getStationStatusCallback(data)
        } else if(query === "GetDaySchedule") {
            self.getDayScheduleCallback(data)
        } else {
            console.log(data)
        }
    },

    // compare the aimed arrival and expected arrival times to find delays
    checkForDelaysCallback: function(data) {
        var self = this
        var delayed_trains = []
        json = JSON.parse(data)
        data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
        self.sendSocketNotification("CheckForDelays", delayed_trains);
        for (var i = 0, len = data.length; i < len; i++) {
            train = data[i].MonitoredVehicleJourney
            call = train.MonitoredCall
            arrive = Date.parse(call.AimedArrivalTime)
            exp = Date.parse(call.ExpectedArrivalTime)
            self.sendSocketNotification("CheckForDelays", train)
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

    getDayScheduleCallback: function(data) {
        json = JSON.parse(data)
        console.log("GetDayScheduleCallback")
        self.sendSocketNotification("GetDaySchedule", json.Content)
    },

    // returns all reported train statuses for a given station
    getStationStatusCallback: function(data) {
        var self = this
        station_status = []
        json = JSON.parse(data)
        data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
        self.sendSocketNotification("GetStationStatus", station_status);
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

    buildCheckForDelays: function(parameters) {
        return {
            url: BASE_URL + 'StopMonitoring',
            method: 'GET',
            encoding: null,
            qs: {
                'agency': 'CT',
                'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d', // TODO: abstract this in parameters
            },
            headers: {
                'Content-Type': 'application/json',
            }
        }
    },

    buildGetStationStatus: function(parameters) {
        // This can be inaccurate if the train is not set to arrive soon. It may be
        // good to threshold this somewhere. Perhaps list the upcomming trains but
        // don't display the status until it's close to the station
        return {
            url: BASE_URL + 'StopMonitoring',
            method: 'GET',
            encoding: null,
            qs: {
                'agency': 'CT',
                'stopCode': '70112',
                'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d', // TODO: abstract this in parameters
            },
            headers: {
                'Content-Type': 'application/json',
            }
        }
    },

    buildGetDaySchedule: function(parameters) {
        // This should only be run once per day, preferably in the morning
        return {
            url: BASE_URL + 'timetable',
            method: 'GET',
            encoding: null,
            qs: {
                'Operator_id': 'CT',
                'Line_id': parameters.line_type,
                'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d',
            },
            headers: {
                'Content-Type': 'application/json',
            }
        }
    },
})
