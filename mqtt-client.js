var mqtt = require('mqtt');
const id = 'signalk-mqtt-client';
var count = 0;
var client;
var intervalTime = 10; // seconds between updates
var TTL = 3600; // default TTL in seconds

module.exports = function (app) {
  var plugin = {};
  var paths = {};
  var updates = [];
  var updateValues = {};
  var metas_prev = [];

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

    function toDelta() {
      context = 'vessels.' + app.selfId;
      // app.debug('context: ' + context + ' values: ' + JSON.stringify(values));
      var deltas = [];
      var metas = [];
      var epoch = Math.floor(+new Date() / 1000);
      for (const [topic, data] of Object.entries(updateValues)) {
        var path = paths[topic] + '.' + topic.replace(/\//, '.').toLowerCase() + '.';
        for (const [key, dataValues] of Object.entries(data)) {
          var value = dataValues['value'];
          if (value == 'ON') {
            value = 1
          }
          if (value == 'OFF') {
            value = 0
          }
          var valueTTL = dataValues['ttl'];
          var new_value = value;
          var units = '';
          var description = '';
          //app.debug('key: ' + key + ' value: ' + value + ' ttl: ' + valueTTL);
          if (valueTTL > epoch) {
            if (key == 'temperature') {
              new_value = parseFloat((value + 273.15).toFixed(2)); // Celcius to Kelvin
              units = 'K'
            }
            if (key == 'pressure') {
              new_value = parseFloat((value * 100).toFixed(2)); // mBar to Pascal
              units = 'Pa'
            }
            if (key == 'humidity') {
              new_value = parseFloat((value / 100).toFixed(2)); // Percent to ratio
              units = 'ratio'
            }
            if (key == 'energy') {
              units = 'Wh'
            }
            if (key == 'power') {
              units = 'W'
            }
            if (key == 'current') {
              units = 'A'
            }
            if (key == 'voltage') {
              if (value > 300) {                                // Fix mV reported
                new_value = parseFloat((value / 1000).toFixed(3));
              }
              units = 'V'
            }
            if (key == 'battery') {
              new_value = parseFloat((value / 100).toFixed(2));
              units = 'ratio'
            }
            if (units == "") {
              deltas.push({path: path + key, value: new_value});
            } else {
              deltas.push({path: path + key, value: new_value});
              metas.push({path: path + key, value: {units: units}});
            }
          }
        }
      }
      if (metas.length == metas_prev.length) {  // Good enough comparison to check if new metas need to be sent
        metas = []
      }
      const delta = {
        context: context,
        updates: [
          {
            $source: 'mqtt',
            meta: metas,
            values: deltas
          },
        ],
      };
      metas_prev = metas.slice()
      return delta
    }

    function sendUpdates () {
      var updates_copy = JSON.parse(JSON.stringify(updates));
      app.debug('Sending updates: ' + JSON.stringify(updates_copy));
      app.handleMessage(id, updates_copy);
    }

    function addValues (topic, values) {
      if (!(topic in updateValues)) {
        updateValues[topic] = {};
      }
      for (const [key, value] of Object.entries(values)) {
        if (!(key in updateValues[topic])) {
          updateValues[topic][key] = {};
        }
        updateValues[topic][key]['value'] = value;
        updateValues[topic][key]['ttl'] = Math.floor(new Date() / 1000) + TTL ;
      }
    }

    setInterval(updateAndSend, intervalTime * 1000);

    function updateAndSend () {
      updates = toDelta();
      sendUpdates();
    }

    //handle incoming messages
    client.on('message',function(topic, message, packet) {
    	app.debug("Topic is " + topic);
      app.debug("Message is " + message);
      if (!topic.match('/bridge/')) {
        topic = topic.replace(/^[a-zA-Z0-9]+\//,'');
        var values = JSON.parse(message);
        addValues(topic, values);
        updateAndSend();
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
      topic_list.push('+/' + topic);
    });
    // topic_list=['#'];
    // var topic_o={"#":1};
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
