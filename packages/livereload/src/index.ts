export function livereload(wsHost: string, wsPort: string) {
  const websocket = new WebSocket(`ws://${wsHost}:${wsPort}`)

  const localstorageState = localStorage.getItem('reloadState')
  const savedState = localstorageState
    ? JSON.parse(localstorageState)
    : undefined

  localStorage.removeItem('reloadState')

  let currentState: any

  websocket.addEventListener('message', (mess) => {
    if (mess.data != 'reload') return

    localStorage.setItem('reloadState', JSON.stringify(currentState))
    location.reload()
  })

  function middleware(dispatch: any) {
    return (state: any, ...args: any) => {
      if (typeof state !== 'function' && !Array.isArray(state)) {
        currentState = state
      }

      return dispatch(state, ...args)
    }
  }

  return { middleware, savedState }
}
