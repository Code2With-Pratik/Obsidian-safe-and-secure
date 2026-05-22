// Ambient module declarations for files handled by the bundler at build time,
// not by TypeScript. Silences TS 2882 ("Cannot find module or type declarations
// for side-effect import of './*.css'") in editors using TypeScript 5.6+.

declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
