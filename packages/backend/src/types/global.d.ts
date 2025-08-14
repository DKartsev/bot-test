declare global {
  interface App {
    log: {
      info: (obj: unknown, msg: string) => void;
      warn: (msg: string) => void;
      error: (obj: unknown, msg: string) => void;
    };
  }

  var app: App | undefined;
}

export {};