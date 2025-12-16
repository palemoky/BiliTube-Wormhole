// WXT framework global types
// These will be available at runtime via WXT
declare const defineBackground: (fn: () => void) => void;
declare const defineContentScript: (config: {
  matches: string[];
  main: () => void | Promise<void>;
}) => void;
declare const browser: typeof chrome;
