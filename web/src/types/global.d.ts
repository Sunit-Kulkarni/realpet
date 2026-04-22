import type { HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      marquee: HTMLAttributes<HTMLElement> & {
        scrollamount?: string | number;
        behavior?: string;
        direction?: string;
      };
    }
  }
}
