// @ts-ignore
import { h, text } from 'hyperapp'

const p = (c: any[]) =>
  []
    .concat(...c)
    .map((any) =>
      typeof any === 'string' || typeof any === 'number' ? text(any) : any
    )

export const fragment = (_props: any, children: any[]) => children

const jsxify = (h: any) => (type: any, props: any, ...children: any[]) => {
  return typeof type === 'function'
    ? type(props, children)
    : h(type, props || {}, p(children))
}
export const jsx = { fa: jsxify(h), fr: fragment } /** @jsx jsx.jsx */
