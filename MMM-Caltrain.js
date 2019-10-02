Module.register("MMM-Caltrain", {

	// Default config
	defaults: {
		key: "fa666f48-2174-4618-a349-97390b7e3e4d",
		text: "Caltrain Monitor",
		updateInterval: 600000, // 10 minutes
        stationName: "Hillsdale", // should abstract this to a code?
        stationCode: "70112",
        timeFormat: 12,
        delayThreshold: 600000, // 10 minutes
	},

	start: function() {
		Log.info("starting module: " + this.name);
        var self = this;

        this.loaded = false;
        this.delays = [];
        this.station = [];

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
        Log.info("Requesting delay info");
        this.sendSocketNotification("CheckForDelays", {
            config: this.config
        });
    },

    getStationInfo: function() {
    	Log.info("Requesting station info");
        this.sendSocketNotification("GetStationStatus", {
            config: this.config
        });
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

        // Generate the station's North/Southbound trains
        if (this.station.length > 0) {
            var southTable = document.createElement("table");
            var northTable = document.createElement("table");
            southTable.className = "small";
            northTable.className = "small";
            for (var i = 0, len = this.station.length; i < len; i++) {
                var t = this.station[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                if (t.dir === "South") {
                    southTable.appendChild(row);
                } else if (t.dir === "North") {
                    northTable.appendChild(row);
                }

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
