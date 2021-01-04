// ../../node_modules/.pnpm/hyperapp@2.0.8/node_modules/hyperapp/hyperapp.js
var e = {}
var n = []
var t = n.map
var l = Array.isArray
var o =
  typeof requestAnimationFrame != 'undefined'
    ? requestAnimationFrame
    : setTimeout
var v = (e2, n2, r, t2, l2, o2) => ({
  type: e2,
  props: n2,
  children: r,
  node: t2,
  key: l2,
  tag: o2
})
var text = (r, t2) => v(r, e, n, t2, null, 3)
var h = (e2, r, t2) => v(e2, r, l(t2) ? t2 : t2 == null ? n : [t2], null, r.key)

// ../../packages/jsx/dist/index.js
var jsxify = (h2) => (type, props, ...children) =>
  typeof type === 'function'
    ? type(props, children)
    : h2(
        type,
        props || {},
        []
          .concat(...children)
          .map((any) =>
            typeof any === 'string' || typeof any === 'number' ? text(any) : any
          )
      )
var jsx = jsxify(h)

// pages/:parameter.tsx
var parameter_default = (state) => {
  return /* @__PURE__ */ jsx('p', null, state.parameter)
}
function getServerSideState(req) {
  return {
    parameter: req.params.parameter
  }
}
export { parameter_default as default, getServerSideState }
