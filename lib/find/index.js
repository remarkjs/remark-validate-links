'use strict'

var trough = require('trough')
var findRepo = require('./find-repo')
var config = require('./config')
var find = require('./find')

module.exports = trough().use(findRepo).use(config).use(find)
