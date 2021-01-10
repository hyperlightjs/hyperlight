import { Request } from '@tinyhttp/app'
import { jsx } from '@hyperlight/jsx'
import { Context, ServerSideState } from 'hyperlight'

export default (state: any) => {
  return <p>Hello {state.param}</p>
}

export function getServerSideState(ctx: Context): ServerSideState {
  return { state: { param: ctx.params.parametername } }
}

