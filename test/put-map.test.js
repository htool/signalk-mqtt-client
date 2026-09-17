'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const put = require('../lib/put-map')

test('maps electrical.switches topic to SK state path', () => {
  assert.equal(
    put.skStatePath('electrical.switches', 'smartplugOntvochtiger'),
    'electrical.switches.smartplugontvochtiger.state'
  )
})

test('PUT only for electrical.switches mappings', () => {
  assert.equal(put.shouldHandlePut('electrical.switches'), true)
  assert.equal(put.shouldHandlePut('environment.inside'), false)
})

test('PUT 0/1 and ON/OFF become zigbee2mqtt state', () => {
  assert.equal(put.toZigbeeState(1), 'ON')
  assert.equal(put.toZigbeeState(0), 'OFF')
  assert.equal(put.toZigbeeState({ value: 1 }), 'ON')
  assert.equal(put.toZigbeeState('off'), 'OFF')
  assert.equal(put.toZigbeeState('Online'), 'ON')
  assert.equal(put.toZigbeeState('Offline'), 'OFF')
})

test('inbound zigbee state becomes SK 0/1', () => {
  assert.equal(put.toSkState('ON'), 1)
  assert.equal(put.toSkState('OFF'), 0)
  assert.equal(put.toSkState(1), 1)
})

test('command topic uses learned prefix', () => {
  assert.equal(
    put.commandTopic(put.topicPrefixFromMqtt('zigbee2mqtt/smartplugOntvochtiger'), 'smartplugOntvochtiger'),
    'zigbee2mqtt/smartplugOntvochtiger/set'
  )
})
