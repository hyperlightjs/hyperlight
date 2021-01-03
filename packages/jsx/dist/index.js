var e={},n=[],l=Array.isArray,v=(e,n,r,t,l,o)=>({type:e,props:n,children:r,node:t,key:l,tag:o});var text=(r,t)=>v(r,e,n,t,null,3);var h=(e,r,t)=>v(e,r,l(t)?t:null==t?n:[t],null,r.key);

// @ts-ignore
var jsxify = function (h) { return function (type, props) {
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    return typeof type === "function"
        ? type(props, children)
        : h(type, props || {}, []
            .concat.apply([], children).map(function (any) {
            return typeof any === "string" || typeof any === "number" ? text(any) : any;
        }));
}; };
var jsx = jsxify(h); /** @jsx jsx */

export { jsx };
