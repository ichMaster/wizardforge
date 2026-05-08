export class ExpressionEngine {
  private variables: Record<string, unknown>;
  private env: Record<string, unknown>;

  constructor(variables: Record<string, unknown> = {}, env: Record<string, unknown> = {}) {
    this.variables = variables;
    this.env = env;
  }

  resolve(template: unknown, context: Record<string, unknown>): unknown {
    if (typeof template !== 'string') return template;

    const singleExpr = template.match(/^\{\{(.+?)\}\}$/);
    if (singleExpr) {
      return this.evaluate(singleExpr[1]!.trim(), context);
    }

    if (!template.includes('{{')) return template;

    return template.replace(/\{\{(.+?)\}\}/g, (_, expr: string) => {
      const value = this.evaluate(expr.trim(), context);
      return value == null ? '' : String(value);
    });
  }

  private evaluate(expr: string, context: Record<string, unknown>): unknown {
    const comparisons: [string, (a: unknown, b: unknown) => boolean][] = [
      [' == ', (a, b) => a == b],
      [' != ', (a, b) => a != b],
      [' >= ', (a, b) => Number(a) >= Number(b)],
      [' <= ', (a, b) => Number(a) <= Number(b)],
      [' > ', (a, b) => Number(a) > Number(b)],
      [' < ', (a, b) => Number(a) < Number(b)],
    ];

    for (const [op, fn] of comparisons) {
      const idx = expr.indexOf(op);
      if (idx !== -1) {
        const left = this.resolveValue(expr.slice(0, idx).trim(), context);
        const right = this.resolveValue(expr.slice(idx + op.length).trim(), context);
        return fn(left, right);
      }
    }

    return this.resolveValue(expr, context);
  }

  private resolveValue(token: string, context: Record<string, unknown>): unknown {
    if ((token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('"') && token.endsWith('"'))) {
      return token.slice(1, -1);
    }

    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    if (token === 'true') return true;
    if (token === 'false') return false;
    if (token === 'null') return null;
    if (token === 'undefined') return undefined;

    const parts = token.split('.');
    const root = parts[0]!;
    const path = parts.slice(1);

    if (root === 'context') return this.getNestedValue(context, path);
    if (root === 'variables') return this.getNestedValue(this.variables, path);
    if (root === 'env') return this.getNestedValue(this.env, path);

    return this.getNestedValue(context, parts);
  }

  private getNestedValue(obj: unknown, path: string[]): unknown {
    let current = obj;
    for (const key of path) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
}
