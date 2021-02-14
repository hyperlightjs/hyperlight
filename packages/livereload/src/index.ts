type Middleware<S> = (dispatch: Dispatch) => Dispatch
type Dispatch = (action: any, props?: any) => void

export function livereload(wsHost: string, wsPort: string) {
  const websocket = new WebSocket(`ws://${wsHost}:${wsPort}`)

  const localstorageState = localStorage.getItem('reloadState')
  const savedState = localstorageState ? JSON.parse(localstorageState) : {}

  localStorage.removeItem('reloadState')

  let currentState: any

  websocket.addEventListener('message', (mess) => {
    if (mess.data != 'reload') return
    localStorage.setItem('reloadState', JSON.stringify(currentState ?? {}))
    location.reload()
  })

  const middlewareConstructor: (realMiddleware: Middleware<any>) => Middleware<any> = (
    middleware: Middleware<any>
  ) => (dispatch: Dispatch) => (state: any, ...args: any) => {
    if (typeof state !== 'function' && !Array.isArray(state)) {
      currentState = state
    }

    return middleware ? middleware(dispatch)(state, ...args) : dispatch(state, ...args)
  }

  return { middlewareConstructor, savedState }
}
