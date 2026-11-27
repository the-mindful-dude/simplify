// Next.js aliases this marker during bundling so importing the server subpath
// from a client component is a build error. No runtime dependency is added.
declare module 'server-only';
