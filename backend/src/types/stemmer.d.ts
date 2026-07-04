// Ambient types for the CommonJS `stemmer` package (v1.x), which ships none.
// v1 exports the Porter stemmer function as the module default.
declare module 'stemmer' {
  const stemmer: (word: string) => string;
  export = stemmer;
}
