
Module.register("MMM-Caltrain", {

    // Default config
    defaults: {
        text: "Caltrain Monitor",
        delayThreshold: 600000, // 10 minutes
        direction: "", // if unset, both directions
        requestDelays: true,
        showDelayedTrains: true, // if true, shows which trains are delayed
        showDelayWarning: true, // if true, shows a warning when trains are delayd
        timeFormat: 24, // default 24 hour time
        trains: {"287": "#66ccff", "282": "#d9b3ff"}, // list of trains to bolden
        updateInterval: 180000, // 3 minutes
    },

    start: function() {
        Log.info("starting module: " + this.name);
        var self = this;

        this.loaded = false;
        this.delays = [];
        this.stationNorth = [];
        this.stationSouth = [];

        if (self.config.requestDelays) {
            self.getDelayInfo();            
        }
        self.getStationInfo();

        // Schedule update timer.
        setInterval(function() {
            if (self.config.requestDelays) {
                self.getDelayInfo();            
            }
            self.getStationInfo();
        }, self.config.updateInterval);
    },

    getStyles: function() {
        return ["MMM-Caltrain.css"];
    },

    getHeader: function() {
        return "Caltrain Departure Time: " + this.config.stationName;
    },

    // Requests information on delayed trains across the fleet
    getDelayInfo: function() {
        Log.info("Requesting delay info");
        this.sendSocketNotification("CheckForDelays", this.config);
    },

    // Requests information for trains arriving at a given station
    // If no direction is chose, both directions are reported
    getStationInfo: function() {
        Log.info("Requesting station info");
        if (this.config.direction.toLowerCase() === "south") {
            this.getSouthboundTrains();
        } else if (this.config.direction.toLowerCase() === "north") {
            this.getNorthboundTrains();
        } else {
            this.getNorthboundTrains();
            this.getSouthboundTrains();
        }
    },

    // Requests southbound train information
    getSouthboundTrains: function() {
        Log.info("Requesting southbound info");
        var params = {
            key: this.config.key,
            trainDirection: "south",
            stationName: this.config.stationName,
        }
        this.sendSocketNotification("GetStationStatus", params);
    },

    // Requests northbound train information
    getNorthboundTrains: function() {
        Log.info("Requesting northbound info");
        var params = {
            key: this.config.key,
            trainDirection: "north",
            stationName: this.config.stationName,
        }
        this.sendSocketNotification("GetStationStatus", params);
    },

    // Creates the station train table
    createTrainTable: function(trains) {
        var table = document.createElement("table");
        table.className = "small";

        table.appendChild(document.createElement("thead"));
        var head = document.createElement("tr");
        head.className = "scheduleHeader"
        table.appendChild(head);
        
        var trainNum = document.createElement("th");
        trainNum.className = "colTrain"
        trainNum.innerHTML = "Train";
        var trainLine = document.createElement("th");
        trainLine.className = "colLine"
        trainLine.innerHTML = "Line";
        var trainETA = document.createElement("th");
        trainETA.className = "colEta";
        trainETA.innerHTML = "ETA";
        var trainStatus = document.createElement("th");
        trainStatus.className = "colStatus";
        trainStatus.innerHTML = "Status";

        head.appendChild(trainNum);
        head.appendChild(trainLine);
        head.appendChild(trainETA);
        head.appendChild(trainStatus);

        var body = document.createElement("tbody")
        body.className = "scheduleBody"
        for (var i = 0, len = trains.length; i < len; i++) {
            var t = trains[i];
            var row = document.createElement("tr");
            if (this.config.trains[t.train] !== undefined) {
                row.className = "highlightTrain";
                row.style.color = this.config.trains[t.train]
            }
            body.appendChild(row);

            var trainName = document.createElement("td");
            trainName.innerHTML = t.train;
            row.appendChild(trainName);

            var trainLine = document.createElement("td");
            trainLine.innerHTML = t.line;
            row.appendChild(trainLine);

            var trainArrival = document.createElement("td");
            var d = new Date(t.arrive);
            localTime = d.toLocaleTimeString('en-US', {hour12: this.config.timeFormat == 12}).split(":")
            trainArrival.innerHTML = localTime[0] + ":" + localTime[1];
            row.appendChild(trainArrival);

            var trainDelay = document.createElement("td");
            if (t.delay <= 0) {
                trainDelay.innerHTML = "On Time";
                trainDelay.className = "onTime";
            } else {
                trainDelay.innerHTML = t.delay + " min late";
                if (t.delay > 10) {
                    trainDelay.className = "majorDelay";
                } else {
                    trainDelay.className = "delayed";
                }
            }
            row.appendChild(trainDelay);
        }
        table.appendChild(body);
        return table;
    },

    // Creates the delayed train table
    createDelayTable: function(trains) {
        var table = document.createElement("table");
        table.className = "small";
        for (var i = 0, len = trains.length; i < len; i++) {
            var t = trains[i];
            var row = document.createElement("tr");
            table.appendChild(row);

            var trainName = document.createElement("td");
            trainName.innerHTML = t.train;
            row.appendChild(trainName);

            var trainDir = document.createElement("td");
            trainDir.innerHTML = t.dir;
            row.appendChild(trainDir);

            var trainStop = document.createElement("td");
            trainStop.innerHTML = t.stop;
            row.appendChild(trainStop);

            var trainDelay = document.createElement("td");
            trainDelay.innerHTML = t.delay + " min late";
            row.appendChild(trainDelay);
        }
        return table;
    },

    // Override dom generator
    getDom: function() {
        Log.info("getDom");
        var wrapper = document.createElement("div");

        if (this.error != null) {
            // only error we have is a stationName error
            var error = document.createElement("div");
            error.innerHTML = "Invalid station name: " + this.config.stationName;
            var errorMsg = document.createElement("div");
            errorMsg.className = "small";
            errorMsg.innerHTML = "You must enter a valid string. Refer to caltrain-stations.txt for a list of valid station names.";
            wrapper.appendChild(error);
            wrapper.appendChild(errorMsg);
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = "LOADING";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Generate the delays report
        if (this.delays.length > 0) {
            if (this.config.showDelayWarning) {
                var head = document.createElement("div");
                head.innerHTML = "Delays Reported";
                head.className = "warning";
                wrapper.appendChild(head);
            }

            if (this.config.showDelayedTrains) {
                var delayTable = this.createDelayTable(this.delays);
                wrapper.appendChild(delayTable);
            }
        }

        // Generate the station's Northbound train status
        if (this.stationNorth.length > 0) {
            var northTable = this.createTrainTable(this.stationNorth);
            var northHead = document.createElement("div");
            northHead.className = "scheduleTitle";
            northHead.innerHTML = "Northbound";
            wrapper.appendChild(northHead);
            wrapper.appendChild(northTable);
        }

        // Generate the station's Southbound train status
        if (this.stationSouth.length > 0) {
            var southTable = this.createTrainTable(this.stationSouth);
            var southHead = document.createElement("div");
            southHead.className = "scheduleTitle";
            southHead.innerHTML = "Southbound";
            wrapper.appendChild(southHead);
            wrapper.appendChild(southTable);
        }

        return wrapper;
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
        } else if (query == "ERROR") {
            this.error = value;
            this.updateDom();
        } else {
            // Everything else is a debug message
            Log.info(query);
            Log.info(value);
        }
    },
});
