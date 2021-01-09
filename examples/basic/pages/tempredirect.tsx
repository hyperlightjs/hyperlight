import { jsx } from '@hyperlight/jsx'
import { Context, ServerSideState } from 'hyperlight'

export default () => <p>If you see this, redirect did not work</p>

export const getServerSideState = (ctx: Context): ServerSideState => {
  return {
    redirect: { dest: 'https://github.com/BRA1L0R/hyperlight/', permanent: false }
  }
}
