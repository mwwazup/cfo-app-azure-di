/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module 'next/server' {
  export interface NextRequest extends Request {
    nextUrl: URL;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      has(name: string): boolean;
      set(name: string, value: string): void;
      delete(name: string): void;
    };
  }

  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }

  export function headers(): Headers;
  export function notFound(): NextResponse;
  export function redirect(url: string | URL, type?: 'replace' | 'push'): NextResponse;
  export function rewrite(destination: string | URL, type?: 'replace' | 'push'): NextResponse;
  export function unstable_noStore(): void;
}
