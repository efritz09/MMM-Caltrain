var request = require("request")
var NodeHelper = require("node_helper")
var zlib = require("zlib")

const BASE_URL = "http://api.511.org/transit/"

// uncertain if it always holds true that 1 is north and 2 is south
const STATIONS = {
    "22nd Street": {"North": 70021, "South": 70022},
    "Atherton": {"North": 70151, "South": 70152},
    "Bayshore": {"North": 70031, "South": 70032},
    "Belmont": {"North": 70121, "South": 70122},
    "Blossom Hill": {"North": 70291, "South": 70292},
    "Broadway": {"North": 70071, "South": 70072},
    "Burlingame": {"North": 70081, "South": 70082},
    "California Ave": {"North": 70191, "South": 70192},
    "Capitol": {"North": 70281, "South": 70282},
    "College Park": {"North": 70251, "South": 70252},
    "Gilroy": {"North": 70321, "South": 70322},
    "Hayward Park": {"North": 70101, "South": 70102},
    "Hillsdale": {"North": 70111, "South": 70112},
    "Lawrence": {"North": 70231, "South": 70232},
    "Menlo Park": {"North": 70161, "South": 70162},
    "Millbrae": {"North": 70061, "South": 70062},
    "Morgan Hill": {"North": 70301, "South": 70302},
    "Mountain View": {"North": 70211, "South": 70212},
    "Palo Alto": {"North": 70171, "South": 70172},
    "Redwood City": {"North": 70141, "South": 70142},
    "San Antonio": {"North": 70201, "South": 70202},
    "San Bruno": {"North": 70051, "South": 70052},
    "San Carlos": {"North": 70131, "South": 70132},
    "San Francisco": {"North": 70011, "South": 70012},
    "San Jose Diridon": {"North": 70261, "South": 70262},
    "San Martin": {"North": 70311, "South": 70312},
    "San Mateo": {"North": 70091, "South": 70092},
    "Santa Clara": {"North": 70241, "South": 70242},
    "South San Francisco": {"North": 70041, "South": 70042},
    "Sunnyvale": {"North": 70221, "South": 70222},
    "Tamien": {"North": 70271, "South": 70272},
    // "Tamien-other": {"North": 777403},
    // "San Jose": {"North": 777401},
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

        self.sendSocketNotification("request params", options);
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
                "stopCode": STATIONS[parameters.stationName][parameters.trainDirection],
                "api_key": parameters.key,
            },
            headers: {
                "Content-Type": "application/json",
            }
        }
    },
})
