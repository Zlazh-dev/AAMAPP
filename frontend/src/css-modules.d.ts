// Type declaration for CSS imports in TS modules (T15 0d)
declare module '*.css' {
  const content: string;
  export default content;
}
