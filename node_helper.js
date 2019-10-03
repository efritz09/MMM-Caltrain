var request = require("request")
var NodeHelper = require("node_helper")
var zlib = require("zlib")

const BASE_URL = "http://api.511.org/transit/"

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper: " + this.name);
        this.sendSocketNotification("starting node helper", "");
    },

    socketNotificationReceived: function(query, parameters) {
        var self = this;
        console.log("Query: " + query + " Parameters: " + parameters);
        var options;
        if(query === "CheckForDelays") {
            options = self.buildCheckForDelays(parameters);
        } else if(query === "GetStationStatus") {
            options = self.buildGetStationStatus(parameters);
        }

        request(options, function(err, resp, body) {
            if(!err && resp.statusCode == 200) {
                if(resp.headers["content-encoding"] == "gzip") {
                    zlib.gunzip(body, function(err, result) {
                        if (err) {
                            console.log("Error gunzipping: ", err);
                        } else {
                            self.requestHandler(query, parameters, result.toString("utf-8").trim());
                        }
                    })
                }
            } else {
                self.sendSocketNotification("request error", resp);
            }
        })
    },

    requestHandler: function(query, parameters, data) {
        if(query === "CheckForDelays") {
            options = this.checkForDelaysCallback(data, parameters.config.delayThreshold);
        } else if(query === "GetStationStatus") {
            options = this.getStationStatusCallback(data);
        }
    },

    // compare the aimed arrival and expected arrival times to find delays
    checkForDelaysCallback: function(data, delayThreshold) {
        var self = this;
        var delayedTrains = [];
        json = JSON.parse(data);
        data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
        for (var i = 0, len = data.length; i < len; i++) {
            train = data[i].MonitoredVehicleJourney;
            call = train.MonitoredCall;
            arrive = Date.parse(call.AimedArrivalTime);
            exp = Date.parse(call.ExpectedArrivalTime);
            trainRef = train.VehicleRef;
            // Sometimes the api doesn't populate train.VehicleRef
            if (trainRef == null) {
                trainRef = train.FramedVehicleJourneyRef.DatedVehicleJourneyRef;
            }
            if ((exp - arrive) > delayThreshold) {
                delayedTrains.push({
                    train: trainRef,
                    stop: call.StopPointName.split(" Caltrain")[0],
                    dir: train.DirectionRef,
                    delay: Math.round((exp - arrive) / 1000 / 60),
                });
            }
        }
        console.log("CheckForDelaysCallback");
        self.sendSocketNotification("CheckForDelays", delayedTrains);
    },

    // returns all reported train statuses for a given station
    getStationStatusCallback: function(data) {
        var self = this;
        stationStatus = [];
        json = JSON.parse(data);
        data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;
        for (var i = 0, len = data.length; i < len; i++) {
            train = data[i].MonitoredVehicleJourney;
            call = train.MonitoredCall;
            // check these?
            arrive = Date.parse(call.AimedArrivalTime);
            exp = Date.parse(call.ExpectedArrivalTime);
            status = Math.round((exp - arrive) / 1000 / 60);

            stationStatus.push({
                train: train.VehicleRef,
                delay: status,
                dir: train.DirectionRef,
                line: train.LineRef,
                arrive: call.AimedArrivalTime,
            });
        }

        console.log("GetStationStatusCallback");
        self.sendSocketNotification("GetStationStatus", stationStatus);
    },

    buildCheckForDelays: function(parameters) {
        return {
            url: BASE_URL + "StopMonitoring",
            method: "GET",
            encoding: null,
            qs: {
                "agency": "CT",
                "api_key": parameters.key,
            },
            headers: {
                "Content-Type": "application/json",
            }
        }
    },

    buildGetStationStatus: function(parameters) {
        // This can be inaccurate if the train is not set to arrive soon. It may be
        // good to threshold this somewhere. Perhaps list the upcomming trains but
        // don't display the status until it's close to the station
        return {
            url: BASE_URL + "StopMonitoring",
            method: "GET",
            encoding: null,
            qs: {
                "agency": "CT",
                "stopCode": parameters.stationCode,
                "api_key": parameters.key,
            },
            headers: {
                "Content-Type": "application/json",
            }
        }
    },
})
