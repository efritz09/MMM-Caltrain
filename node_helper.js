var request = require('request');
var NodeHelper = require("node_helper");
var zlib = require('zlib');
// var { URL } = require('url');

BASE_URL = 'http://api.511.org/transit/';

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper: " + this.name);
    },

    // Create a url to get estimated times of depature from the given station
    // using the API key
    // build_req: function(endpoint, api_key, args) {
    //     // url = BASE_URL + endpoint;
    //     // method = 'GET';
    //     // headers = {

    //     // }

    //     search_url = new URL(BASE_URL);
    //     search_url.searchParams.set('cmd', 'etd');
    //     search_url.searchParams.set('json', 'y');
    //     search_url.searchParams.set('key', key);
    //     search_url.searchParams.set('orig', station);
    //     return search_url
    // },

    socketNotificationReceived: function(notification, payload) {
        var self = this;
        console.log("Notification: " + notification + " Payload: " + payload);

        if(notification === "StopMonitoring") {
            options = {
                url: BASE_URL + 'StopMonitoring',
                method: 'GET',
                encoding: null,
                qs: {
                    'agency': 'CT',
                    'stopCode': '',
                    'api_key': 'fa666f48-2174-4618-a349-97390b7e3e4d',
                }
            }
            console.log("checkpoint!");
            // self.sendSocketNotification("DEBUG", options)
            request(options, function(err, response, body) {
                console.log("checkpoint! 2");
                console.log(err, body);
                if (!err && response.statusCode == 200) {
                    if(response.headers['content-encoding'] == 'gzip') {
                        zlib.gunzip(body, function(err, data) {
                            if(err) {
                                console.log("ERROR", err);
                            } else {
                                console.log(data.toString());
                            }
                        });
                    }
                    self.sendSocketNotification("DEBUG", "data");
                }
                // finally {
                //     payload = {
                //         'err': err,
                //         'response': response,
                //         'body': data
                //     }
                // }
            });
        }

        // if(notification === "GET_DEPARTURE_TIMES") {

        //     var bart_url = this.build_search_url(payload.config.station, payload.config.key);

        //     request(bart_url.href, function (error, response, body) {
        //         var departure_times = {};
        //         departure_times.trains = [];
        //         if (!error && response.statusCode == 200) {

        //             trains = JSON.parse(body).root.station[0];
        //             departure_times.station_name = trains.name;

        //             trains.etd.forEach(train => {
        //                 departure_times.trains.push(train.destination);
        //                 departure_times[train.destination] = [];
        //                 train.estimate.forEach(est => {
        //                     departure_times[train.destination].push(est.minutes);
        //                 })
        //             });
        //             console.log("Train times loaded:" + departure_times);
        //             self.sendSocketNotification("DEPARTURE_TIMES", departure_times);
        //         }
        //         else {
        //             console.log("Bart Loading failed", error, response.statusCode);
        //         }
        //     });
        // }
    },
});
