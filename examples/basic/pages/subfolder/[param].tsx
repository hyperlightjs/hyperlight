import { jsx } from '@hyperlight/jsx'
import { Context } from 'hyperlight'
import fs from 'fs'
import path from 'path'

interface PageState {
  title: string
  text: string
  slug: string
}

// export const Head = (state: PageState) => {
//   return (
//     <>
//       <title>{state.title}</title>
//     </>
//   )
// }

export default (state: PageState) => {
  return (
    <section>
      <p className="text">Hello world</p>
      <p>{state.text}</p>
      <p>{state.slug}</p>
      <p>{state.title}</p>

      <input
        value={state.text}
        oninput={(state: PageState, event: { target: HTMLInputElement }) => {
          return { ...state, text: event.target.value }
        }}
      />
    </section>
  )
}

export function getInitialState() {
  return {
    text: 'Edit me!'
  }
}

export function getServerSideState(ctx: Context) {
  return {
    state: {
      title: fs.readFileSync(path.join('pages', 'module.css'), 'utf-8'),
      slug: ctx.params.param
    }
  }
}
