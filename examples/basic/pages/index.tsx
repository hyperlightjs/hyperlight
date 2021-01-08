import { jsx } from '@hyperlight/jsx'
import { Request, Context, ServerSideStateFunc } from 'hyperlight'

import './module.css'

function FragmentComponent(props: Record<string, any>, children: any[]) {
  return (
    <>
      <p>Custom component</p>
      <p>With fragment</p>
      <p>Property: {props.testProp}</p>
      <p>Children: {...children}</p>
    </>
  )
}

type State = Partial<{
  text: string
  test: string
  headers: string
  othertext: string
}>

export default (state: State) => {
  return (
    <section>
      <p className="text">Hello world</p>
      <img src="/logo.png" />
      <p>cddd</p>
      <p>{state.text}</p>
      <p>{state.othertext}</p>
      <p>{state.test}</p>
      <FragmentComponent testProp="Hello component!">
        <p>children1</p>
        <p>children2</p>
      </FragmentComponent>
      <p>
        Server side prop {'=>'} {state.headers}
      </p>

      <input
        value={state.text}
        oninput={(state: State, event: { target: HTMLInputElement }) => {
          return { ...state, text: event.target.value }
        }}
      />
      <input
        value={state.othertext}
        oninput={(state: State, event: { target: HTMLInputElement }) => {
          return { ...state, othertext: event.target.value }
        }}
      />
    </section>
  )
}

export const getServerSideState: ServerSideStateFunc = (ctx: Context) => {
  return {
    state: {
      headers: ctx.req.headers['user-agent']
    }
  }
}

export const getInitialState = (): State => {
  return {
    text: 'hello world'
  }
}
