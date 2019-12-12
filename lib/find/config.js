'use strict'

var hostedGitInfo = require('hosted-git-info')

module.exports = config

var viewPaths = {github: 'blob', gitlab: 'blob', bitbucket: 'src'}
var headingPrefixes = {github: '#', gitlab: '#', bitbucket: '#markdown-header-'}
var topAnchors = {github: '#readme', gitlab: '#readme'}
var lineLinks = {github: true, gitlab: true}

function config(ctx) {
  var repo = ctx.repository
  var urlConfig = ctx.urlConfig
  var info = {}

  if (urlConfig) {
    return
  }

  urlConfig = {
    prefix: '',
    headingPrefix: '#',
    lines: false,
    hostname: null,
    topAnchor: null
  }

  if (repo) {
    info = hostedGitInfo.fromUrl(repo)
  }

  if (info) {
    if (info.type in viewPaths) {
      urlConfig.prefix = '/' + info.path() + '/' + viewPaths[info.type] + '/'
    }

    if (info.type in headingPrefixes) {
      urlConfig.headingPrefix = headingPrefixes[info.type]
    }

    if (info.type in lineLinks) {
      urlConfig.lines = lineLinks[info.type]
    }

    if (info.type in topAnchors) {
      urlConfig.topAnchor = topAnchors[info.type]
    }

    urlConfig.hostname = info.domain
  }

  ctx.urlConfig = urlConfig
}
