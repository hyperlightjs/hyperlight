import { Request } from '@tinyhttp/app'
import { jsx } from '@hyperlight/jsx'

export default (state: any) => {
  return <p>{state.parameter}</p>
}

export function getServerSideState(req: Request) {
  return {
    parameter: req.params.parameter
  }
}
