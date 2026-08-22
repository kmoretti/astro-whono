/// <reference types="astro/client" />

declare module '*.astro' {
  const Component: any;
  export default Component;
}

declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
