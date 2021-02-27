import { ErrorHandler, Handler } from '@tinyhttp/app'

export const noMatchHandler: Handler = async (_req, res, _next) => {
  res.status(404).send('<code>Not found</code>') // TODO: Not found page
}

export const onError: ErrorHandler = async (err: TypeError, req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Error</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        * {
          font-family: sans-serif;
        }
        div {
          background: white;
          box-shadow: 0px 4px 30px rgba(0, 0, 0, 0.25);
          padding: 2rem;
          border-radius: 15px;
          color: red;
        }
        h1 {
          margin-top: 0;
        }
      </style>
    </head>
    <body>
      <div>
        <h1>${err.name}: ${err.message}</h1>
        <pre>${err.stack}</pre>
      </div>
    </body>
  </html>
  `)
}
