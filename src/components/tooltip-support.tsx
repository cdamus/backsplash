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

import Tooltip, { TooltipProps } from '@mui/material/Tooltip';
import { partial } from 'lodash';
import { ComponentType, ForwardedRef, useState } from 'react';

export function withTooltip<T extends HTMLElement, P extends object>(Component: ComponentType<P>, wrap = false) {
  return ({
    ref,
    tooltip,
    tipPlacement = 'bottom',
    ...props
  }: P & { tooltip?: string; tipPlacement?: TooltipProps['placement'] } & { ref?: ForwardedRef<T | null> }) => {
    const [open, setOpen] = useState(false);
    const doWrap = wrap || ('disabled' in props && !!props.disabled);

    const close =
      <E extends React.SyntheticEvent>(onEvent: string) =>
      (e: E) => {
        setOpen(false);
        if (onEvent in props) {
          const eventHandler = (props as P & Record<string, React.EventHandler<E>>)[onEvent];
          eventHandler?.(e);
        }
      };

    return tooltip ? (
      <Tooltip
        open={open}
        onOpen={partial(setOpen, true)}
        onClose={partial(setOpen, false)}
        onMouseDown={close('onMouseDown')}
        onKeyDown={close('onKeyDown')}
        title={tooltip}
        placement={tipPlacement}
        arrow
        enterDelay={1000}
        enterNextDelay={500}
      >
        {doWrap ? (
          <span>
            <Component {...(props as P)} ref={ref} />
          </span>
        ) : (
          <Component {...(props as P)} ref={ref} />
        )}
      </Tooltip>
    ) : (
      <Component {...(props as P)} ref={ref} />
    );
  };
}
