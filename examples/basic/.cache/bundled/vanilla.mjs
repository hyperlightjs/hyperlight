// ../../node_modules/.pnpm/hyperapp@2.0.8/node_modules/hyperapp/hyperapp.js
var e = {};
var n = [];
var t = n.map;
var l = Array.isArray;
var o = typeof requestAnimationFrame != "undefined" ? requestAnimationFrame : setTimeout;
var v = (e2, n2, r, t2, l2, o2) => ({type: e2, props: n2, children: r, node: t2, key: l2, tag: o2});
var text = (r, t2) => v(r, e, n, t2, null, 3);
var h = (e2, r, t2) => v(e2, r, l(t2) ? t2 : t2 == null ? n : [t2], null, r.key);

// pages/vanilla.ts
var vanilla_default = (state) => h("h1", {}, text("Hyperscript"));
export {
  vanilla_default as default
};
