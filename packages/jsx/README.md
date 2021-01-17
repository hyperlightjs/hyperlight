# @hyperlight/jsx

[![npm (scoped)][npm-badge]](https://npmjs.com/package/@hyperlight/jsx) [![npm][dl-badge]](https://npmjs.com/package/@hyperlight/jsx)

JSX support for [Hyperapp](https://github.com/jorgebucaran/hyperapp).

## Install

```sh
pnpm i @hyperlight/jsx
```

## Setup

Add this field to `tsconfig.json` (or `jsonconfig.json`):

```json
{
  "jsx": "preserve"
}
```

## Usage

```jsx
import { jsx } from '@hyperlight/jsx'

export const view = (state) => <h1>{state}</h1>
```

[npm-badge]: https://img.shields.io/npm/v/@hyperlight/jsx?style=for-the-badge&color=%234AB8F2
[dl-badge]: https://img.shields.io/npm/dt/@hyperlight/jsx?style=for-the-badge&color=%234AB8F2
