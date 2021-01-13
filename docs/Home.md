# Hyperlight

Hyperlight is a next-gen [Hyperapp](https://github.com/jorgebucaran/hyperapp) framework. 

It is completely written in typescript and cjs free, inspired by [Next.js](https://nextjs.org/). It uses [esbuild](https://esbuild.github.io/) to achieve such speeds and size

Get started by reading the [[Get Started]] guide, or read the full documentation in the [[Documentation]] section

```tsx
import { jsx } from '@hyperlight/jsx'
import "./style.css"

export default () => <h1>Hello World</h1>
```

## Top features:
- **Small** bundle sizes and build times (4kb minimum)
- **Server-Side** rendering and **Server-Side** state
- **Dev** server with live reload
- **JSX** support with `@hyperlight/jsx`
