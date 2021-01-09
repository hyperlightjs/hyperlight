import { jsx } from '@hyperlight/jsx'
import { Context, ServerSideState } from 'hyperlight'

export default () => <p>If you see this, notfound did not work</p>

export const getServerSideState = (ctx: Context): ServerSideState => {
  return {
    notFound: true
  }
}
