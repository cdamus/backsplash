/*****************************************************************************
 * Copyright 2025 Christian W. Damus
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
 * (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *****************************************************************************/

import { DependencyList, RefObject, useEffect } from 'react';

export function useMutationObserver<T extends HTMLElement, A extends string & keyof T>(
  ref: RefObject<HTMLElement | null | undefined>,
  attr: A,
  onChange: (value: string | null) => void,
  deps: DependencyList = [],
): void {
  if (attr === 'className') {
    attr = 'class' as A;
  }

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    let lastKnownValue = ref.current.getAttribute(attr);

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === attr) {
          const currentValue = (mutation.target as T).getAttribute(attr);
          if (currentValue !== lastKnownValue) {
            lastKnownValue = currentValue;
            onChange(currentValue);
          }
        }
      }
    });

    mutationObserver.observe(ref.current, { attributes: true });
    return () => mutationObserver.disconnect();
  }, [
    ref,
    attr,
    onChange,
    // eslint-disable-next-line
    ...deps,
  ]);
}
