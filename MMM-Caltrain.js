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

Module.register("MMM-Caltrain", {

	// Default config
	defaults: {
		// key: "fa666f48-2174-4618-a349-97390b7e3e4d",
		text: "Caltrain Monitor",
		updateInterval: 600000, // 10 minutes
        stationName: "", // should abstract this to a code?
        // stationCode: "70112",
        direction: "", // if unset, both directions - TODO: implement
        timeFormat: 12,
        delayThreshold: 600000, // 10 minutes
	},

	start: function() {
		Log.info("starting module: " + this.name);
        var self = this;

        this.requestParams = {
            key: this.conifg.key,
            delayThreshold: this.config.delayThreshold,
        }
        this.loaded = false;
        this.delays = [];
        this.stationNorth = [];
        this.stationSouth = [];

		self.getDelayInfo();
		self.getStationInfo();

		// Schedule update timer.
		setInterval(function() {
			self.getDelayInfo();
			self.getStationInfo();
		}, self.config.updateInterval);
	},

	getStyles: function() {
		return ["MMM-Caltrain.css"];
	},

    getDelayInfo: function() {
        var params = {
            key: this.config.key,
            delayThreshold: this.config.delayThreshold,
        }
        Log.info("Requesting delay info");
        this.sendSocketNotification("CheckForDelays", params);
    },

    getStationInfo: function() {
    	Log.info("Requesting station info");
        if (this.direction.toLowerCase() == "south") {
            this.getSouthboundTrains();
        } else if (this.direction.toLowerCase() == "north") {
            this.getNorthboundTrains();
        } else {
            // request both north and south
            this.getNorthboundTrains();
            this.getSouthboundTrains();
        }
    },

    getSouthboundTrains: function() {
        Log.info("Requesting southbound info");
        var params = {
            key: this.config.key,
            delayThreshold: this.config.delayThreshold,
            stationCode: STATIONS[this.config.stationName]["South"],
        }
        Log.info(params)
        this.sendSocketNotification("GetStationStatus", params)
    },


    getNorthboundTrains: function() {
        Log.info("Requesting northbound info");
        var params = {
            key: this.config.key,
            delayThreshold: this.config.delayThreshold,
            stationCode: STATIONS[this.config.stationName]["North"],
        }
        Log.info(params)
        this.sendSocketNotification("GetStationStatus", params)
    },

    // Override dom generator.
    getDom: function() {
    	Log.info("getDom");
        var wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = "LOADING";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Generate the delays report
        if (this.delays.length > 0) {
            var head = document.createElement("legend")
            head.innerHTML = "WARNING: Delays Reported";
            head.className = "warning";
            wrapper.appendChild(head);

            var table = document.createElement("table");
            table.className = "small";
            for (var i = 0, len = this.delays.length; i < len; i++) {
                var t = this.delays[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                table.appendChild(row);

                var trainName = document.createElement("td");
                trainName.className = "train";
                trainName.innerHTML = t.train;
                row.appendChild(trainName);

                var trainDir = document.createElement("td");
                trainDir.className = "trainDir";
                trainDir.innerHTML = t.dir;
                row.appendChild(trainDir);

                var trainStop = document.createElement("td");
                trainStop.className = "trainStop";
                trainStop.innerHTML = t.stop;
                row.appendChild(trainStop);

                var trainDelay = document.createElement("td");
                trainDelay.className = "trainDelay";
                trainDelay.innerHTML = t.delay + " min late";
                row.appendChild(trainDelay);
            }
            wrapper.appendChild(table);
        }

        // Generate the station's Northbound train status
        if (this.stationNorth.length > 0) {
            var northTable = document.createElement("table");
            northTable.className = "small";
            for (var i = 0, len = this.station.length; i < len; i++) {
                var t = this.station[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                northTable.appendChild(row);

                var trainName = document.createElement("td");
                trainName.className = "train";
                trainName.innerHTML = t.train;
                row.appendChild(trainName);

                var trainLine = document.createElement("td");
                trainLine.className = "line";
                trainLine.innerHTML = t.line;
                row.appendChild(trainLine);

                var trainArrival = document.createElement("td");
                trainArrival.className = "arrive";
                var d = new Date(t.arrive);
                var hours = d.getHours() % this.config.timeFormat;
                var minutes = d.getMinutes();
                trainArrival.innerHTML = hours + ":" + minutes;
                row.appendChild(trainArrival);

                var trainDelay = document.createElement("td");
                trainDelay.className = "trainDelay";
                if (t.delay <= 0) {
                    trainDelay.innerHTML = "On Time";
                } else {
                    trainDelay.innerHTML = t.delay + " min";
                }
                row.appendChild(trainDelay);
            }

            var northHead = document.createTextNode("Northbound");
            northHead.className = "small";
            wrapper.appendChild(northHead);
            wrapper.appendChild(northTable);
        }

        // Generate the station's Southbound train status
        if (this.stationSouth.length > 0) {
            // might be best to split this up into two sections instead
            // then we can filter based on the config.direction
            var southTable = document.createElement("table");
            southTable.className = "small";
            for (var i = 0, len = this.station.length; i < len; i++) {
                var t = this.station[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                southTable.appendChild(row);

                var trainName = document.createElement("td");
                trainName.className = "train";
                trainName.innerHTML = t.train;
                row.appendChild(trainName);

                var trainLine = document.createElement("td");
                trainLine.className = "line";
                trainLine.innerHTML = t.line;
                row.appendChild(trainLine);

                var trainArrival = document.createElement("td");
                trainArrival.className = "arrive";
                var d = new Date(t.arrive);
                var hours = d.getHours() % this.config.timeFormat;
                var minutes = d.getMinutes();
                trainArrival.innerHTML = hours + ":" + minutes;
                row.appendChild(trainArrival);

                var trainDelay = document.createElement("td");
                trainDelay.className = "trainDelay";
                if (t.delay <= 0) {
                    trainDelay.innerHTML = "On Time";
                } else {
                    trainDelay.innerHTML = t.delay + " min";
                }
                row.appendChild(trainDelay);
            }

            var southHead = document.createTextNode("Southbound");
            southHead.className = "small";
            wrapper.appendChild(southHead);
            wrapper.appendChild(southTable);
        }

        return wrapper;
    },

    // Override get header function
    getHeader: function() {
        return "Caltrain Departure Time: " + this.config.stationName;
    },

    // Override notification handler.
    socketNotificationReceived: function(query, value) {
    	Log.info("socketNotificationReceived")
        if (query === "CheckForDelays") {
        	Log.info("CheckForDelays");
            this.delays = value;
            Log.info(value);
            this.loaded = true;
            this.updateDom();
        } else if (query === "GetStationStatus") {
        	Log.info("GetStationStatus");
            this.station = value;
            Log.info(value);
            this.loaded = true;
            this.updateDom();
        } else {
            // Everything else is a debug message
            Log.info(query);
            Log.info(value);
        }
    },
});
