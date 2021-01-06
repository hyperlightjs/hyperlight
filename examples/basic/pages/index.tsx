// eslint-disable-next-line unused-imports/no-unused-imports
import { jsx } from '@hyperlight/jsx'
import { Request } from '@tinyhttp/app'

import './module.css'

function CustomComponent() {
  return <p>Custom component</p>
}

export default (state: any) => {
  return (
    <section>
      <p className="text">Hello world</p>
      <p>cddd</p>
      <p>{state.text}</p>
      <p>{state.test}</p>
      <CustomComponent>component</CustomComponent>
      <p>
        Server side prop {'=>'} {state.headers}
      </p>

      <input
        value={state.text}
        oninput={(state, event: { target: HTMLInputElement }) => {
          return { ...state, text: event.target.value }
        }}
      />
    </section>
  )
}

export const getServerSideState = (req: Request) => {
  return {
    test: 'I <3 server side state x2',
    headers: req.headers['user-agent']
  }
}

export const getInitialState = () => {
  return {
    text: 'hello world'
  }
}
