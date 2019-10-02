Module.register("MMM-Caltrain", {

	// Default config
	defaults: {
		key: "fa666f48-2174-4618-a349-97390b7e3e4d",
		text: "Caltrain Monitor",
		updateInterval: 600000, // 10 minutes
        station_name: "Hillsdale", // should abstract this to a code?
        station_code: "70112",
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
        
        // var compliment = document.createTextNode("test");
        // wrapper.className = this.config.classes ? this.config.classes : "thin xlarge bright pre-line";
        // wrapper.appendChild(compliment);

        if (this.delays.length > 0) {
            var head = document.createTextNode("WARNING: Delays Reported");
            head.className = "small";
            wrapper.appendChild(head);

            var table = document.createElement("table");
            table.className = "small";
            for (var i = 0, len = this.delays.length; i < len; i++) {
                var t = this.delays[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                table.appendChild(row);

                var train_name = document.createElement("td");
                train_name.className = "train";
                train_name.innerHTML = t.train;
                row.appendChild(train_name);

                var train_dir = document.createElement("td");
                train_dir.className = "train_dir";
                train_dir.innerHTML = t.dir;
                row.appendChild(train_dir);

                var train_stop = document.createElement("td");
                train_stop.className = "train_stop";
                train_stop.innerHTML = t.stop;
                row.appendChild(train_stop);

                var train_delay = document.createElement("td");
                train_delay.className = "train_delay";
                train_delay.innerHTML = t.delay + " min";
                row.appendChild(train_delay);
            }
            wrapper.appendChild(table);
        }

        if (this.station.length > 0) {
            var south_table = document.createElement("table");
            var north_table = document.createElement("table");
            south_table.className = "small";
            north_table.className = "small";
            for (var i = 0, len = this.station.length; i < len; i++) {
                var t = this.station[i];
                console.log("appending: ", t);
                var row = document.createElement("tr");
                if (t.dir === "South") {
                    south_table.appendChild(row);
                } else if (t.dir === "North") {
                    north_table.appendChild(row);
                }

                var train_name = document.createElement("td");
                train_name.className = "train";
                train_name.innerHTML = t.train;
                row.appendChild(train_name);

                var train_line = document.createElement("td");
                train_line.className = "line";
                train_line.innerHTML = t.line;
                row.appendChild(train_line);

                var train_arrive = document.createElement("td");
                train_arrive.className = "arrive";
                var d = new Date(t.arrive);
                var hours = d.getHours() % 12
                var minutes = d.getMinutes()
                train_arrive.innerHTML = hours + ":" + minutes;
                row.appendChild(train_arrive);

                var train_delay = document.createElement("td");
                train_delay.className = "train_delay";
                if (t.delay <= 0) {
                    train_delay.innerHTML = "On Time"
                } else {
                    train_delay.innerHTML = t.delay + " min";
                }
                row.appendChild(train_delay);
            }

            var north_head = document.createTextNode("Northbound");
            north_head.className = "small";
            wrapper.appendChild(north_head)
            wrapper.appendChild(north_table);

            var south_head = document.createTextNode("Southbound");
            south_head.className = "small";
            wrapper.appendChild(south_head)
            wrapper.appendChild(south_table);
        }

        return wrapper;
    },

    // Override get header function
    getHeader: function() {
        // if (this.info) {
        //     console.log(this.info.station_name);
        //     return this.info.station_name + " Caltrain Departure Times";
        // }
        return "Caltrain Departure Time:" + this.config.station_name;
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