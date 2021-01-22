import { jsx } from '@hyperlight/jsx'
import { InitialStateFunc } from 'hyperlight'
import {
  Page,
  ServerSideStateFunc
} from '../../../../packages/hyperlight/src/types'

interface PageState {
  title: string
  text: string
}

export const Head = (state: PageState) => {
  return (
    <>
      <title>{state.title}</title>
    </>
  )
}

export default (state: PageState) => {
  return (
    <section>
      <p className="text">Hello world</p>
      <img src="/logo.png" />
      <p>{state.text}</p>

      <input
        value={state.text}
        oninput={(state: PageState, event: { target: HTMLInputElement }) => {
          return { ...state, text: event.target.value }
        }}
      />
    </section>
  )
}

export const getInitialState: InitialStateFunc<PageState> = () => {
  return {
    text: 'Edit me!',
    title: 'Welcome to hyperlight!'
  }
}

export const getServerSideState: ServerSideStateFunc<PageState> = (ctx) => {
  return {
    state: {
      text: 'Server side gen'
    }
  }
}
