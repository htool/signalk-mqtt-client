'use strict'

function unwrapPut (value) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, 'value')
  ) {
    return value.value
  }
  return value
}

function isOn (value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0 || value == null) return false
  const s = String(value).trim().toLowerCase()
  return s === 'on' || s === '1' || s === 'true' || s === 'online'
}

function toZigbeeState (value) {
  return isOn(unwrapPut(value)) ? 'ON' : 'OFF'
}

function toSkState (value) {
  if (value === true || value === 1) return 1
  if (value === false || value === 0) return 0
  const s = String(value).trim().toLowerCase()
  if (s === 'on' || s === '1' || s === 'true' || s === 'online') return 1
  if (s === 'off' || s === '0' || s === 'false' || s === 'offline') return 0
  return value
}

function shouldHandlePut (basePath) {
  const p = String(basePath || '')
  return p === 'electrical.switches' || p.startsWith('electrical.switches.')
}

function skStatePath (basePath, topic) {
  return basePath + '.' + String(topic).replace(/\//g, '.').toLowerCase() + '.state'
}

function commandTopic (prefix, topic) {
  return (prefix || 'zigbee2mqtt') + '/' + topic + '/set'
}

function topicPrefixFromMqtt (fullTopic) {
  const i = String(fullTopic).indexOf('/')
  return i > 0 ? fullTopic.slice(0, i) : 'zigbee2mqtt'
}

function stripPrefix (fullTopic) {
  return String(fullTopic).replace(/^[a-zA-Z0-9]+\//, '')
}

module.exports = {
  unwrapPut,
  isOn,
  toZigbeeState,
  toSkState,
  shouldHandlePut,
  skStatePath,
  commandTopic,
  topicPrefixFromMqtt,
  stripPrefix
}
