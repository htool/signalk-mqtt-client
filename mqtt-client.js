var mqtt = require('mqtt');
const id = 'signalk-mqtt-client';
var count = 0;
var client;


module.exports = function (app) {
  var plugin = {};
  var paths = {};
  plugin.id = 'signalk-mqtt-client';
  plugin.name = 'Simple MQTT client';
  plugin.description = 'Simple MQTT client to get updates from MQTT broker';

  plugin.start = function (options, restartPlugin) {
    app.debug('Options: ' + JSON.stringify(options));
    for (const [key, value] of Object.entries(options.paths)) {
      paths[value['topic']] = value['path'];
    }
    app.debug('paths: ' + JSON.stringify(paths));

    const remoteHost = options.remoteHost;
    client = mqtt.connect(remoteHost,{clientId:"signalk-mqtt-client"});
    app.debug("Connected flag " + client.connected);
    // Here we put our plugin logic

    function toDelta(topic, values) {
      context = 'vessels.' + app.selfId;
      // app.debug('context: ' + context + ' values: ' + JSON.stringify(values));
      var path = paths[topic] + '.' + topic.replace(/\//, '.').toLowerCase() + '.';

      var deltas = [];
      for (const [key, value] of Object.entries(values)) {
        var new_value = value;
        if (key == 'temperature') {
          new_value = (value + 273.15).toFixed(2); // Celcius to Kelvin
        }
        if (key == 'pressure') {
          new_value = value * 100; // mBar to Pascal
        }
        if (key == 'humidity') {
          new_value = (value / 100).toFixed(2); // Percent to ratio
        }
        if (key == 'voltage') {
          new_value = (value / 1000).toFixed(3); // Percent to ratio
        }
        if (key == 'battery') {
          new_value = (value / 100).toFixed(2); // Percent to ratio
        }
        deltas.push({path: path + key, value: new_value});
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
        topic = topic.replace(/zigbee2mqtt\//,'');
        var values = JSON.parse(message);
        app.handleMessage(id, toDelta(topic, values));
      }
    });

    client.on("connect",function() {
      app.debug("Connected " + client.connected);
    })

    client.on("end",function() {
      app.debug("Disconnected at own request.");
    })

    //var topic_list=["zigbee2mqtt/#", "zigbee2mqtt/Douche", "zigbee2mqtt/Woonkamer"];
    var topic_list=[];
    Object.keys(paths).forEach(function(topic) {
        topic_list.push('zigbee2mqtt/' + topic);
    });
    var topic_o={"Buiten":1};
    app.debug("Subscribing to topics: " + topic_list);
    // client.subscribe('Buiten',{qos:1}); //single topic
    client.subscribe(topic_list,{qos:1}); //topic list
    // client.subscribe(topic_o); //object

    app.debug('Plugin started');
  };

  plugin.stop = function () {
    // Here we put logic we need when the plugin stops
    client.end();
    app.debug('Plugin stopped');
  };

  plugin.schema = {
    // The plugin schema
    title: 'Signal K - MQTT simple client',
    type: 'object',
    required: ['remoteHost'],
    properties: {
      remoteHost: {
        type: 'string',
        title: 'MQTT server Url (starts with mqtt/mqtts)',
        description:
          'MQTT server connect to',
        default: 'mqtt://somehost',
      },
      username: {
        type: "string",
        title: "MQTT server username"
      },
      password: {
        type: "string",
        title: "MQTT server password"
      },
      paths: {
        type: 'array',
        title: 'Topics to subscribe to',
        items: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              title: 'Topic',
            },
            path: {
              type: 'string',
              title: 'Self path',
              default: 'environment'
            },
          },
        },
      },
    }
  };
  return plugin;
};
