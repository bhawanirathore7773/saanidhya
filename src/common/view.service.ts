import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as nunjucks from 'nunjucks';
import { createViewEnv } from './view';

@Injectable()
export class ViewService {
  private readonly env: nunjucks.Environment = createViewEnv();

  /** Render a template with the per-request values (res.locals) plus the page's own context. */
  render(res: Response, template: string, context: Record<string, any> = {}, status = 200): void {
    const html = this.env.render(template, { ...res.locals, ...context });
    res.status(status).type('html').send(html);
  }

  renderString(res: Response, template: string, context: Record<string, any> = {}): string {
    return this.env.render(template, { ...res.locals, ...context });
  }
}
