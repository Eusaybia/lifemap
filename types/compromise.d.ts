declare module 'compromise' {
  interface CompromiseDocument {
    places(): CompromiseDocument;
    people(): CompromiseDocument;
    organizations(): CompromiseDocument;
    out(format: 'array'): string[];
    out(format: 'json'): any;
    out(format: 'text'): string;
  }

  function compromise(text: string): CompromiseDocument;
  
  export = compromise;
} 