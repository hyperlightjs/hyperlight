import { NextFunction, Request, Response } from '@tinyhttp/app'

export async function noMatchHandler(req: Request, res: Response, _next?: NextFunction) {
  res.status(404).send('<code>Not found</code>') // TODO: Not found page
}
