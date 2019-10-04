
Module.register("MMM-Caltrain", {

	// Default config
	defaults: {
		text: "Caltrain Monitor",
		updateInterval: 600000, // 10 minutes
        stationName: "", // should abstract this to a code?
        direction: "", // if unset, both directions
        timeFormat: 12,
        delayThreshold: 600000, // 10 minutes
	},

	start: function() {
		Log.info("starting module: " + this.name);
        var self = this;

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
        Log.info("Requesting delay info");
        this.sendSocketNotification("CheckForDelays", this.config);
    },

    getStationInfo: function() {
    	Log.info("Requesting station info");
        if (this.config.direction.toLowerCase() === "south") {
            this.getSouthboundTrains();
        } else if (this.config.direction.toLowerCase() === "north") {
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
            trainDirection: "south",
            stationName: this.config.stationName,
        }
        this.sendSocketNotification("GetStationStatus", params);
    },


    getNorthboundTrains: function() {
        Log.info("Requesting northbound info");
        var params = {
            key: this.config.key,
            trainDirection: "north",
            stationName: this.config.stationName,
        }
        this.sendSocketNotification("GetStationStatus", params);
    },

    createTrainTable: function(trains) {
        var table = document.createElement("table");
        table.className = "small";
        var row = document.createElement("tr");
        for (var i = 0, len = trains.length; i < len; i++) {
            var t = trains[i];
            console.log("appending: ", t);
            var row = document.createElement("tr");
            table.appendChild(row);

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
            localTime = d.toLocaleTimeString('en-US', {hour12: this.config.timeFormat == 12}).split(":")
            trainArrival.innerHTML = localTime[0] + ":" + localTime[1];
            row.appendChild(trainArrival);

            var trainDelay = document.createElement("td");
            trainDelay.className = "trainDelay";
            if (t.delay <= 0) {
                trainDelay.innerHTML = "On Time";
            } else {
                trainDelay.innerHTML = t.delay + " min late";
            }
            row.appendChild(trainDelay);
        }
        return table;
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
            var northTable = this.createTrainTable(this.stationNorth);
            var southHead = document.createElement("div");
            southHead.className = "scheduleHeader";
            southHead.innerHTML = "Northbound";
            wrapper.appendChild(northHead);
            wrapper.appendChild(northTable);
        }

        // Generate the station's Southbound train status
        if (this.stationSouth.length > 0) {
            var southTable = this.createTrainTable(this.stationSouth);
            var southHead = document.createElement("div");
            southHead.className = "scheduleHeader";
            southHead.innerHTML = "Southbound";
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
            this.delays = value;
            this.loaded = true;
            this.updateDom();
        } else if (query === "GetNorthboundTrains") {
            this.stationNorth = value;
            this.loaded = true;
            this.updateDom();
        } else if (query === "GetSouthboundTrains") {
            this.stationSouth = value;
            this.loaded = true;
            this.updateDom();
        } else {
            // Everything else is a debug message
            Log.info(query);
            Log.info(value);
        }
    },
});
