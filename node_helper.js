var request = require("request")
var NodeHelper = require("node_helper")
var zlib = require("zlib")

const BASE_URL = "http://api.511.org/transit/"

// uncertain if it always holds true that 1 is north and 2 is south
const STATIONS = {
    "22nd Street": [70021, 70022],
    "Atherton": [70152, 70151],
    "Bayshore": [70032, 70031],
    "Belmont": [70121, 70122],
    "Blossom Hill": [70292, 70291],
    "Broadway": [70072, 70071],
    "Burlingame": [70081, 70082],
    "California Ave": [70191, 70192],
    "Capitol": [70282, 70281],
    "College Park": [70251, 70252],
    "Gilroy": [70321, 70322],
    "Hayward Park": [70101, 70102],
    "Hillsdale": [70112, 70111],
    "Lawrence": [70232, 70231],
    "Menlo Park": [70161, 70162],
    "Millbrae": [70062, 70061],
    "Morgan Hill": [70301, 70302],
    "Mountain View": [70211, 70212],
    "Palo Alto": [70172, 70171],
    "Redwood City": [70142, 70141],
    "San Antonio": [70202, 70201],
    "San Bruno": [70052, 70051],
    "San Carlos": [70132, 70131],
    "San Francisco": [70012, 70011],
    "San Jose": [777402],
    "San Jose Diridon": [70262, 70261],
    "San Martin": [70311, 70312],
    "San Mateo": [70091, 70092],
    "Santa Clara": [70242, 70241],
    "South San Francisco": [70042, 70041],
    "Sunnyvale": [70221, 70222],
    "Tamien": [70271, 70272],
    "Tamien-other": [777403], 
}


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
                "api_key": parameters.config.key,
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
                "stopCode": parameters.config.stationCode,
                "api_key": parameters.config.key,
            },
            headers: {
                "Content-Type": "application/json",
            }
        }
    },
})
