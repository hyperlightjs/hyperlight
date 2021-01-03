// @ts-ignore
import { h, text } from "hyperapp";

const jsxify = (h: any) => (type: any, props: any, ...children: any[]) =>
  typeof type === "function"
    ? type(props, children)
    : h(
        type,
        props || {},
        []
          .concat(...children)
          .map((any) =>
            typeof any === "string" || typeof any === "number" ? text(any) : any
          )
      );
export const jsx = jsxify(h); /** @jsx jsx */
