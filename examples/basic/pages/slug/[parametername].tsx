import { Request } from '@tinyhttp/app'
// eslint-disable-next-line unused-imports/no-unused-imports
import { jsx } from '@hyperlight/jsx'

export default (state: any) => {
  return <p>Hello {state.param.parametername}</p>
}

export function getServerSideState(req: Request) {
  return {
    param: req.params
  }
}
