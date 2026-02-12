import React from "react";

// Type declarations for lord-icon custom element
// Uses React.JSX namespace for compatibility with react-jsx transform

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          trigger?: string;
          delay?: string;
          colors?: string;
          state?: string;
          target?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          trigger?: string;
          delay?: string;
          colors?: string;
          state?: string;
          target?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
