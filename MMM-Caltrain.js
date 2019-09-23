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

		this.getDelayInfo()
		this.getStationInfo()

		// Schedule update timer.
		setInterval(function() {
			this.getDelayInfo()
			this.getStationInfo()
		}, this.config.updateInterval)
	},

	getStyles: function() {
		return ["MMM-Caltrain.css"]
	},

    getDelayInfo: function() {
        Log.info("Requesting delay info")

        this.sendSocketNotification("CheckForDelays", {
            config: this.config
        })
        Log.info()
    },

    getStationInfo: function() {
    	Log.info("Requesting station info")

        this.sendSocketNotification("GetStationStatus", {
            config: this.config
        })
        Log.info()
    },

    // Override dom generator.
    getDom: function() {
    	Log.info("getDom");
        // var wrapper = document.createElement("div");

        // if (!this.info) {
        //     wrapper.innerHTML = "LOADING";
        //     wrapper.className = "dimmed light small";
        //     return wrapper;
        // }

        // var table = document.createElement("table");
        // table.className = "small";
		// var complimentText = this.randomCompliment();

		var compliment = document.createTextNode(this.info);
		var wrapper = document.createElement("div");
		wrapper.className = this.config.classes ? this.config.classes : "thin xlarge bright pre-line";
		wrapper.appendChild(compliment);

		return wrapper;
        // this.info.trains.forEach(train_name => {

        //     if (this.config.train_blacklist.includes(train_name)) {
        //         console.log('gottem')
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
        //             time_to_departure += ' min';
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
        //     return this.info.station_name + ' Caltrain Departure Times';
        // }
        return 'Caltrain Departure Times'
    },

    // Override notification handler.
    socketNotificationReceived: function(query, parameters) {
    	Log.info("socketNotificationReceived")
        if (query === "CheckForDelays") {
        	Log.info("CheckForDelays")
            this.info = "CheckForDelays"
            Log.info(parameters)
            this.updateDom()
        } else if (query === "GetStationStatus") {
        	Log.info("GetStationStatus")
            this.info = "GetStationStatus"
            Log.info(parameters)
            this.updateDom()
        }
    },

});