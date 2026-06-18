// Empty stub used by Turbopack's resolveAlias to prevent @ffmpeg/* from being
// bundled at build time. The actual modules are loaded at runtime via
// /* webpackIgnore: true */ dynamic imports in hooks/use-ffmpeg.ts.
export default {}
