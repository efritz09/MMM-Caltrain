var NodeHelper = require("node_helper")
var request = require("request")
var zlib = require("zlib")

const BASE_URL = "http://api.511.org/transit/"

// uncertain if it always holds true that 1 is north and 2 is south
const STATIONS = {
    "22nd Street": {"north": 70021, "south": 70022},
    "Atherton": {"north": 70151, "south": 70152},
    "Bayshore": {"north": 70031, "south": 70032},
    "Belmont": {"north": 70121, "south": 70122},
    "Blossom Hill": {"north": 70291, "south": 70292},
    "Broadway": {"north": 70071, "south": 70072},
    "Burlingame": {"north": 70081, "south": 70082},
    "California Ave": {"north": 70191, "south": 70192},
    "Capitol": {"north": 70281, "south": 70282},
    "College Park": {"north": 70251, "south": 70252},
    "Gilroy": {"north": 70321, "south": 70322},
    "Hayward Park": {"north": 70101, "south": 70102},
    "Hillsdale": {"north": 70111, "south": 70112},
    "Lawrence": {"north": 70231, "south": 70232},
    "Menlo Park": {"north": 70161, "south": 70162},
    "Millbrae": {"north": 70061, "south": 70062},
    "Morgan Hill": {"north": 70301, "south": 70302},
    "Mountain View": {"north": 70211, "south": 70212},
    "Palo Alto": {"north": 70171, "south": 70172},
    "Redwood City": {"north": 70141, "south": 70142},
    "San Antonio": {"north": 70201, "south": 70202},
    "San Bruno": {"north": 70051, "south": 70052},
    "San Carlos": {"north": 70131, "south": 70132},
    "San Francisco": {"north": 70011, "south": 70012},
    "San Jose Diridon": {"north": 70261, "south": 70262},
    "San Martin": {"north": 70311, "south": 70312},
    "San Mateo": {"north": 70091, "south": 70092},
    "Santa Clara": {"north": 70241, "south": 70242},
    "South San Francisco": {"north": 70041, "south": 70042},
    "Sunnyvale": {"north": 70221, "south": 70222},
    "Tamien": {"north": 70271, "south": 70272},
    // "Tamien-other": {"north": 777403},
    // "San Jose": {"north": 777401},
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
            var station = STATIONS[parameters.stationName];
            if (station == null) {
                self.sendSocketNotification("ERROR", "stationName");
                return;
            }
            options = self.buildGetStationStatus(parameters, station[parameters.trainDirection]);
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
            options = this.checkForDelaysCallback(data, parameters.delayThreshold);
        } else if(query === "GetStationStatus") {
            options = this.getStationStatusCallback(data, parameters.trainDirection);
        }
    },

    // compare the aimed arrival and expected arrival times to find delays
    checkForDelaysCallback: function(data, delayThreshold) {
        var self = this;
        var delayedTrains = [];
        var json = JSON.parse(data);
        var data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit
        for (var i = 0, len = data.length; i < len; i++) {
            var train = data[i].MonitoredVehicleJourney;
            var call = train.MonitoredCall;
            var delay = getDelay(call);
            // Sometimes the api doesn't populate train.VehicleRef
            var trainRef = train.FramedVehicleJourneyRef.DatedVehicleJourneyRef;

            if (delay > delayThreshold) {
                delayedTrains.push({
                    train: train.FramedVehicleJourneyRef.DatedVehicleJourneyRef,
                    stop: call.StopPointName.split(" Caltrain")[0],
                    dir: train.DirectionRef,
                    delay: Math.round(delay / 1000 / 60),
                });
            }
        }
        console.log("CheckForDelaysCallback");
        self.sendSocketNotification("CheckForDelays", delayedTrains);
    },

    // returns all reported train statuses for a given station
    getStationStatusCallback: function(data, direction) {
        var self = this;
        stationStatus = [];
        var json = JSON.parse(data);
        var data = json.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;
        for (var i = 0, len = data.length; i < len; i++) {
            var train = data[i].MonitoredVehicleJourney;
            var call = train.MonitoredCall;
            var delay = getDelay(call);
            var status = Math.round(delay / 1000 / 60);
            // Sometimes the api doesn't populate train.VehicleRef
            var trainRef = train.FramedVehicleJourneyRef.DatedVehicleJourneyRef;

            stationStatus.push({
                train: trainRef,
                delay: status,
                dir: train.DirectionRef,
                line: train.LineRef,
                arrive: call.AimedArrivalTime,
            });
        }

        console.log("GetStationStatusCallback");
        if (direction === "south") {
            self.sendSocketNotification("GetSouthboundTrains", stationStatus);
        } else if (direction === "north") {
            self.sendSocketNotification("GetNorthboundTrains", stationStatus);
        }
    },

    getDelay: function(call) {
        /* The caltrain API can do some stupid stuff. For instance:
        {
            "AimedArrivalTime": "2019-10-05T00:05:00Z",
            "ExpectedArrivalTime": "2019-10-05T23:48:46Z",
            "AimedDepartureTime": "2019-10-06T00:05:00Z",
            "ExpectedDepartureTime": "2019-10-06T00:05:00Z",
        }

        In this case, the AimedArrivalTime didn't increment the day when it
        went over 23:59, so now we have to deal with that.
        */
        var arrival = Date.parse(call.AimedArrivalTime);
        var exp = Date.parse(call.ExpectedArrivalTime);
        var now = Date.now();

        // The API can mess up the aimed arrival time. If the arrival time is
        // earlier than the current time, use the ExpectedDepartureTime
        if (arrival < now) {
            arrival = Date.parse(call.AimedDepartureTime);
        }

        return exp - arrival
    },

    // returns the request parameters to get delayed train status
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

    // returns the request parameters to get station train status
    buildGetStationStatus: function(parameters, stopCode) {
        return {
            url: BASE_URL + "StopMonitoring",
            method: "GET",
            encoding: null,
            qs: {
                "agency": "CT",
                "stopCode": stopCode,
                "api_key": parameters.key,
            },
            headers: {
                "Content-Type": "application/json",
            }
        }
    },
})
