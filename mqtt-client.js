var mqtt = require('mqtt');
const id = 'signalk-mqtt-client';
var count = 0;



module.exports = function (app) {
  var plugin = {};

  plugin.id = 'signalk-mqtt-client';
  plugin.name = 'Simple MQTT client';
  plugin.description = 'Simple MQTT client to get updates from MQTT broker';

  plugin.start = function (options, restartPlugin) {
    var client = mqtt.connect("mqtt://192.168.1.117",{clientId:"signalk-mqtt-client"});
    app.debug("Connected flag " + client.connected);
    // Here we put our plugin logic

    function toDelta(path, values) {
      context = 'vessels.' + app.selfId;
      var deltas = [];
      for (const [key, value] of Object.entries(values)) {
        deltas.push({path: (path + '.' + key).toLowerCase(), value: value});
      }
      const delta = {
        context: context,
        updates: [
          {
            $source: 'mqtt',
            values: deltas
          },
        ],
      };
      app.debug('delta: ' +  JSON.stringify(delta));
      return delta
    }


    //handle incoming messages
    client.on('message',function(topic, message, packet) {
    	app.debug("Message is " + message);
    	app.debug("Topic is " + topic);
      if (!topic.match('/bridge/')) {
        var path = 'environment.' + topic.replace(/zigbee2mqtt\//,'').replace(/\//,'.');
        var values = JSON.parse(message);
        app.debug('path: ' + path + ' values: ' + JSON.stringify(values));
        app.handleMessage(id, toDelta(path, values));
      }
    });

    client.on("connect",function() {
      app.debug("Connected " + client.connected);
    })

    var topic_list=["zigbee2mqtt/#", "zigbee2mqtt/Douche", "zigbee2mqtt/Woonkamer"];
    var topic_o={"Buiten":1};
    app.debug("Subscribing to topics");
    // client.subscribe('Buiten',{qos:1}); //single topic
    client.subscribe(topic_list,{qos:1}); //topic list
    // client.subscribe(topic_o); //object

    app.debug('Plugin started');
  };

  plugin.stop = function () {
    // Here we put logic we need when the plugin stops
    app.debug('Plugin stopped');
  };

  plugin.schema = {
    // The plugin schema
  };

  return plugin;
};
