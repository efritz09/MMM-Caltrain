Module.register("MMM-Caltrain", {

	// Default config
	defaults: {
		key: "fa666f48-2174-4618-a349-97390b7e3e4d",
		text: "Caltrain Monitor",
		updateInterval: 600000, // 10 minutes
	},

	// All of this is based on the BART one

	start: function() {
		Log.info("starting module: " + this.name);

        this.loaded = false;
        this.delays = null;
        this.station = null;


		this.getDelayInfo();
		this.getStationInfo();

		// Schedule update timer.
		setInterval(function() {
			this.getDelayInfo();
			this.getStationInfo();
		}, this.config.updateInterval);
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

        if (this.delays) {
            var table = document.createElement("table");
            table.className = "small";
            for (var i = 0, len = this.delays.length; i < len; i++) {
                var t = this.delays[i]
                console.log("appending: ", t)
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
                train_delay.innerHTML = t.delay;
                row.appendChild(train_delay);
            }
        }

        // var table = document.createElement("table");
        // table.className = "small";
		// var complimentText = this.randomCompliment();

		var compliment = document.createTextNode("test");
		var wrapper = document.createElement("div");
		wrapper.className = this.config.classes ? this.config.classes : "thin xlarge bright pre-line";
		wrapper.appendChild(compliment);

		return wrapper;
        // this.info.trains.forEach(train_name => {

        //     if (this.config.train_blacklist.includes(train_name)) {
        //         console.log("gottem")
        //         return;
        //     }

        //     var row = document.createElement("tr");
        //     table.appendChild(row);

        //     var trainCell = document.createElement("td");
        //     trainCell.className = "train";
        //     trainCell.innerHTML = train_name;
        //     row.appendChild(trainCell);

        //     this.info[train_name].forEach( time_to_departure => {
        //         var timeCell = document.createElement("td");
        //         timeCell.className = "time";
        //         if (!isNaN(time_to_departure)) {
        //             time_to_departure += " min";
        //         }
        //         timeCell.innerHTML = time_to_departure;
        //         row.appendChild(timeCell);
        //     });
        // });

        // return table;
    },

    // Override get header function
    getHeader: function() {
        // if (this.info) {
        //     console.log(this.info.station_name);
        //     return this.info.station_name + " Caltrain Departure Times";
        // }
        return "Caltrain Departure Times";
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
            Log.info(query);
            Log.info(value);
        }
    },

});