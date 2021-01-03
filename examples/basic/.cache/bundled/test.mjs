// ../../packages/jsx/dist/index.js
var e = {};
var n = [];
var l = Array.isArray;
var v = (e2, n2, r, t, l2, o) => ({type: e2, props: n2, children: r, node: t, key: l2, tag: o});
var text = (r, t) => v(r, e, n, t, null, 3);
var h = (e2, r, t) => v(e2, r, l(t) ? t : t == null ? n : [t], null, r.key);
var jsxify = function(h2) {
  return function(type, props) {
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
      children[_i - 2] = arguments[_i];
    }
    return typeof type === "function" ? type(props, children) : h2(type, props || {}, [].concat.apply([], children).map(function(any) {
      return typeof any === "string" || typeof any === "number" ? text(any) : any;
    }));
  };
};
var jsx = jsxify(h);

// pages/test.tsx
var test_default = (state) => {
  return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx("h1", null, "aaaasssssssss"), /* @__PURE__ */ jsx("p", null, "bbbb"), /* @__PURE__ */ jsx("p", null, state.text), /* @__PURE__ */ jsx("p", null, state.test), /* @__PURE__ */ jsx("p", null, "Server side prop ", "=>", " ", state.headers), /* @__PURE__ */ jsx("input", {
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
  test_default as default,
  getInitialState,
  getServerSideState
};
