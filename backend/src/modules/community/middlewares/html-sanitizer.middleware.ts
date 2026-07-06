import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
const sanitizeHtml = require('sanitize-html');

@Injectable()
export class HtmlSanitizerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      this.sanitizeObject(req.body);
    }
    next();
  }

  private sanitizeObject(obj: any) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Only sanitize typical rich text fields to avoid breaking URLs or IDs
        if (
          key === 'content' ||
          key === 'text' ||
          key === 'description' ||
          key === 'title'
        ) {
          obj[key] = sanitizeHtml(obj[key], {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              '*': ['class', 'style'],
            },
          });
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeObject(obj[key]);
      }
    }
  }
}
