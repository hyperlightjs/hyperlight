import sirv from 'sirv'

export const serveStaticFolder = (directory: string, cache = false) =>
  sirv(directory, { dev: !cache, etag: cache })
