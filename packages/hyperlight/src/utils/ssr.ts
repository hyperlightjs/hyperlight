import { renderToString } from 'hyperapp-render'
import { htmlTemplate } from '../templates'
import type { JsTemplate } from '../templates'

import {
  Context,
  InitialStateFunc,
  ServerSideRenderResult,
  ServerSideStateFunc,
  State
} from '../typings'

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
): Promise<ServerSideRenderResult> => {
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
      head ? renderToString(head(state)) : '',
      renderToString(view(state)),
      stylesheetPath
    ),
    serverSideState: serverSideState
  }
}
