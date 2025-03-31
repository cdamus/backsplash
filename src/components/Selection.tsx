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

import { Box, QuadTree } from 'js-quadtree';
import { RefObject, useEffect } from 'react';
import { TileSize } from '../model/geometry';
import { Tile } from '../model/tile-generator';
import { assertExists } from '../utils/type-utils';
import { spread } from 'lodash';

export type Hit = {
  x: number;
  y: number;
  data: Tile;
};

export type TileSelection = {
  anchor: Hit;
  head: Hit;
};

export type TileSelectionManagerProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  store: QuadTree;
  tileSize: TileSize;
  onSelection?: (selection: TileSelection | null) => void;
  onSelectionEnd?: (selection: TileSelection | null) => void;
  onAltClick?: (hit: Hit) => void;
};

type SelectionGestureListeners = {
  mousedown: (e: MouseEvent) => void;
  mousemove: (e: MouseEvent) => void;
  mouseup: (e: MouseEvent) => void;
  keydown: (e: KeyboardEvent) => void;
};

export default function TileSelectionManager({
  canvasRef,
  store,
  tileSize,
  onSelection,
  onSelectionEnd,
  onAltClick,
}: TileSelectionManagerProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    assertExists(canvas, 'canvas');

    let anchor: Hit | undefined;
    let head: Hit | undefined;

    const canvasBounds = canvas.getBoundingClientRect();

    function search(e: MouseEvent) {
      return new Box(
        e.clientX - canvasBounds.left - tileSize.width / 2,
        e.clientY - canvasBounds.top - tileSize.height / 2,
        tileSize.width,
        tileSize.height
      );
    }

    let gestureListeners: SelectionGestureListeners | undefined;
    if (onSelection && onSelectionEnd) {
      gestureListeners = {
        mousedown(e: MouseEvent) {
          if (e.altKey) {
            return;
          }
          const hits = store.query(search(e));
          if (hits.length > 0) {
            anchor = hits[0];
            head = hits[0];
            onSelection({ anchor, head });
          } else {
            anchor = undefined;
            head = undefined;
            onSelection(null);
          }
        },
        mousemove(e: MouseEvent) {
          if (!anchor || !head || e.altKey) {
            return;
          }
          const hits = store.query(search(e));
          if (hits.length > 0 && anchor) {
            head = hits[0];
            onSelection({ anchor, head });
          }
        },
        mouseup(e: MouseEvent) {
          if (e.altKey) {
            return;
          }
          if (anchor && head) {
            onSelectionEnd({ anchor, head });
          } else {
            onSelectionEnd(null);
          }
          anchor = undefined;
          head = undefined;
        },
        keydown(e: KeyboardEvent) {
          if (anchor && head && e.key === 'Escape') {
            // Cancel selection
            anchor = undefined;
            head = undefined;
            onSelection(null);
            onSelectionEnd(null);
          }
        },
      };
    }

    let onClick: ((e: MouseEvent) => void) | undefined;
    if (onAltClick) {
      onClick = (e: MouseEvent) => {
        if (!e.altKey) {
          return;
        }
        const hits = store.query(search(e));
        if (hits.length > 0) {
          hits.forEach(onAltClick);
        }
      };
    }

    if (gestureListeners) {
      canvas.tabIndex = -1; // To accept keyboard input
      Object.entries(gestureListeners).forEach(spread(canvas.addEventListener.bind(canvas)));
    }
    if (onClick) {
      canvas.addEventListener('click', onClick);
    }

    return () => {
      if (onClick) {
        canvas.removeEventListener('click', onClick);
      }
      if (gestureListeners) {
        Object.entries(gestureListeners).forEach(spread(canvas.removeEventListener.bind(canvas)));
      }
    };
  }, [canvasRef, store, onSelection, onSelectionEnd, onAltClick, tileSize]);

  return null;
}
