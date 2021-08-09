/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('unified-engine').FileSet} FileSet
 * @typedef {import('hosted-git-info').Hosts} Hosts
 * @typedef {import('../index.js').Options} Options
 * @typedef {import('../index.js').UrlConfig} UrlConfig
 */

import hostedGitInfo from 'hosted-git-info'

/** @type {Partial<Record<Hosts, string>>} */
const viewPaths = {github: 'blob', gitlab: 'blob', bitbucket: 'src'}
/** @type {Partial<Record<Hosts, string>>} */
const headingPrefixes = {
  github: '#',
  gitlab: '#',
  bitbucket: '#markdown-header-'
}
/** @type {Partial<Record<Hosts, string>>} */
const topAnchors = {github: '#readme', gitlab: '#readme'}
/** @type {Partial<Record<Hosts, boolean>>} */
const lineLinks = {github: true, gitlab: true}

/**
 * @param {{tree: Root, file: VFile, fileSet?: FileSet, options: Options}} ctx
 */
export function config(ctx) {
  const repo = ctx.options.repository

  if (ctx.options.urlConfig) {
    return
  }

  /** @type {UrlConfig} */
  const urlConfig = {
    prefix: '',
    headingPrefix: '#',
    lines: false,
    hostname: undefined,
    topAnchor: undefined
  }

  if (repo) {
    const info = hostedGitInfo.fromUrl(repo)

    if (info && info.type !== 'gist') {
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
  }

  ctx.options.urlConfig = urlConfig
}
