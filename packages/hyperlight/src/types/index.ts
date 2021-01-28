import type { Request, Response } from '@tinyhttp/app'
import { Middleware, State, Subscription, VDOM } from 'hyperapp'

export interface Context {
  req: Request
  res: Response
  params: Record<string, any>
}

export type ServerSideState<S> = Partial<{
  state: Partial<State<S>>
  notFound: boolean
  redirect: {
    permanent: boolean
    dest: string
    statusCode?: 301 | 302 | 303 | 304 | 307 | 308
  }
}>

export type ServerSideStateFunc<S> = (
  ctx: Context
) => ServerSideState<S> | Promise<ServerSideState<S>>

export type InitialStateFunc<S> = () => Promise<Partial<State<S>>> | Partial<State<S>>

export interface ServerSideRenderResult<S> {
  html: string
  serverSideState: ServerSideState<S>
}

export type AppSettingsFunc<S> = (state: State<S>) => AppSettings<S>

export type AppSettings<S> = Partial<{
  middleware: Middleware<S>
  subscriptions: Subscription<S>[]
}>

export interface PageExports<S = any> {
  default: (state: State<S>) => VDOM<S>
  Head: (state: State<S>) => VDOM<S>
  getServerSideState?: ServerSideStateFunc<S>
  getInitialState?: InitialStateFunc<S>
}

export type { Request, Response }
