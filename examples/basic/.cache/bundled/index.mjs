// ../../node_modules/.pnpm/hyperapp@2.0.8/node_modules/hyperapp/hyperapp.js
var e = {};
var n = [];
var t = n.map;
var l = Array.isArray;
var o = typeof requestAnimationFrame != "undefined" ? requestAnimationFrame : setTimeout;
var v = (e2, n2, r, t2, l2, o2) => ({type: e2, props: n2, children: r, node: t2, key: l2, tag: o2});
var text = (r, t2) => v(r, e, n, t2, null, 3);
var h = (e2, r, t2) => v(e2, r, l(t2) ? t2 : t2 == null ? n : [t2], null, r.key);

// ../../packages/jsx/dist/index.js
var jsxify = (h2) => (type, props, ...children) => typeof type === "function" ? type(props, children) : h2(type, props || {}, [].concat(...children).map((any) => typeof any === "string" || typeof any === "number" ? text(any) : any));
var jsx = jsxify(h);

// pages/index.tsx
function CustomComponent(props) {
  return;
}
var pages_default = (state) => {
  return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("p", {
    className: "text"
  }, "aaaa"), /* @__PURE__ */ jsx("p", null, "bbbb"), /* @__PURE__ */ jsx("p", null, state.text), /* @__PURE__ */ jsx("p", null, state.test), /* @__PURE__ */ jsx(CustomComponent, null, "component"), /* @__PURE__ */ jsx("p", null, "Server side prop ", "=>", " ", state.headers), /* @__PURE__ */ jsx("input", {
    value: state.text,
    oninput: (state2, event) => {
      return {...state2, text: event.target.value};
    }
  }));
};
var getServerSideState = (req) => {
  return {test: "I <3 server side state", headers: req.headers["user-agent"]};
};
var getInitialState = () => {
  return {
    text: "hello world"
  };
};
export {
  pages_default as default,
  getInitialState,
  getServerSideState
};
