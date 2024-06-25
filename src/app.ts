import { Namespace, createNamespace } from 'continuation-local-storage';
import cors from 'cors';
import routes from './routes';
import express, {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { ErrorHandler } from 'express-handler-errors';
import morgan from 'morgan-body';

import logger from './middlewares/logger';

class App {
  public readonly app: Application;

  private readonly session: Namespace;

  constructor() {
    this.app = express();
    this.session = createNamespace('request');
    this.middlewares();
    this.routes();
    this.errorHandle();
  }

  private middlewares(): void {
    this.app.use(express.json());
    this.app.use(cors());
    const reqId = require('express-request-id');
    this.app.use(reqId());
    const attachContext: RequestHandler = (
      _: Request,
      __: Response,
      next: NextFunction
    ) => {
      this.session.run(() => next());
    };

    const setRequestId: RequestHandler = (
      req: Request,
      _: Response,
      next: NextFunction
    ) => {
      this.session.set('id', req.id);
      next();
    };
    this.app.use(attachContext, setRequestId);
    morgan(this.app, {
      noColors: true,
      prettify: false,
      logReqUserAgent: false,
      stream: {
        write: (msg: string) => logger.info(msg) as any,
      },
    });
  }

  private errorHandle(): void {
    this.app.use(
      (err: Error, _: Request, res: Response, next: NextFunction) => {
        new ErrorHandler().handle(err, res, next, logger as any);
      }
    );
  }

  private routes(): void {
    this.app.use('/api', routes);
  }
}

export default new App();
