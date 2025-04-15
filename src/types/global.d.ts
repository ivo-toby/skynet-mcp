// Define fetch type for Node.js environments
declare global {
  interface Window {
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
  }
  
  var fetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export {};
