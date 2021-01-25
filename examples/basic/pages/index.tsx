import { jsx } from '@hyperlight/jsx'
import { InitialStateFunc } from 'hyperlight'
import fs from 'fs'
import path from 'path'

import './module.css'

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
    text: "Edit me!",
    title: 'Welcome to hyperlight!'
  }
}
