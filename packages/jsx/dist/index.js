import { text, h } from 'hyperapp';

const jsxify = (h2) => (type, props, ...children) => typeof type === "function" ? type(props, children) : h2(type, props || {}, [].concat(...children).map((any) => typeof any === "string" || typeof any === "number" ? text(any) : any));
const jsx = jsxify(h);

export { jsx };
