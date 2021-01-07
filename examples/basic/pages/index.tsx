// eslint-disable-next-line unused-imports/no-unused-imports
import { jsx } from '@hyperlight/jsx'
import { Request } from '@tinyhttp/app'

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
}>

export default (state: State) => {
  return (
    <section>
      <p className="text">Hello world</p>
      <p>cddd</p>
      <p>{state.text}</p>
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
    </section>
  )
}

export const getServerSideState = (req: Request): State => {
  return {
    test: 'I <3 server side state x2',
    headers: req.headers['user-agent']
  }
}

export const getInitialState = (): State => {
  return {
    text: 'hello world'
  }
}
