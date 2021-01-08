import { renderToString } from 'hyperapp-render'
import { htmlTemplate } from '../templates'
import type { JsTemplate } from '../templates'
import type { Request, Response } from '@tinyhttp/app'

export interface Context {
  req: Request
  res: Response
  params: Record<string, string>
}

export type State = any

export type ServerSideState = Partial<{
  state: State
  notFound: boolean
  redirect: {
    permanent: boolean
    dest: string
    statusCode?: 301 | 302 | 303 | 304 | 307 | 308
  }
}>

export type ServerSideStateFunc = (ctx: Context) => ServerSideState

export type InitialStateFunc = () => State

interface PageModule {
  default: (state: State) => any
  Head: (state: State) => any

  getServerSideState: ServerSideStateFunc
  getInitialState: InitialStateFunc
}

export const serverSideRender = async (
  serverModule: { module: PageModule; initialState?: State },
  pagePath: string,
  stylesheetPath: string,
  jsTemplate: JsTemplate,
  ctx?: Context
) => {
  const view = serverModule.module.default
  const head = serverModule.module.Head

  const serverSideState = ctx
    ? serverModule.module.getServerSideState?.(ctx) ?? {}
    : {}
  const initialState =
    serverModule.initialState ?? serverModule.module.getInitialState?.() ?? {}

  if (typeof view !== 'function') {
    throw 'The default export is not a function'
  }

  const state = { ...initialState, ...serverSideState.state }

  return {
    html: htmlTemplate(
      await jsTemplate(state, pagePath),
      renderToString(head(state)),
      renderToString(view(state)),
      stylesheetPath
    ),
    serverSideState: serverSideState
  }
}
