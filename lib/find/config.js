import hostedGitInfo from 'hosted-git-info'

const viewPaths = {github: 'blob', gitlab: 'blob', bitbucket: 'src'}
const headingPrefixes = {
  github: '#',
  gitlab: '#',
  bitbucket: '#markdown-header-'
}
const topAnchors = {github: '#readme', gitlab: '#readme'}
const lineLinks = {github: true, gitlab: true}

export function config(ctx) {
  const repo = ctx.repository

  if (ctx.urlConfig) {
    return
  }

  const urlConfig = {
    prefix: '',
    headingPrefix: '#',
    lines: false,
    hostname: null,
    topAnchor: null
  }

  if (repo) {
    const info = hostedGitInfo.fromUrl(repo)

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
  }

  ctx.urlConfig = urlConfig
}
