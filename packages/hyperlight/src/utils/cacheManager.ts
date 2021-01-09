export const generateCacheHeaders = (
  etag: string,
  cacheability: 'public' | 'private' = 'private',
  maxAge = 500
) => {
  return {
    ETag: etag,
    'Cache-Control': `${cacheability},max-age=${maxAge},immutable`
  }
}
