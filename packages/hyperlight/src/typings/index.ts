import type { Request, Response } from '@tinyhttp/app'

export interface Context {
  req: Request
  res: Response
  params: Record<string, string>
}

export type State<S = any> = S

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

export interface ServerSideRenderResult {
  html: string
  serverSideState: ServerSideState
}

export type AppSettingsFunc = (state: State) => AppSettings

export type AppSettings = Partial<{ middleware: any; subscriptions: any }>
