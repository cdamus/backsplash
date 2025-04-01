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
import { RefObject, useCallback, useEffect, useState } from 'react';
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
  const [selection, setSelection] = useState<TileSelection | null>(null);

  const updateSelection = useCallback(
    (anchor: Hit, head: Hit) => {
      if (selection === null || selection.anchor !== anchor || selection.head !== head) {
        const newSelection = { anchor, head };
        setSelection(newSelection);
        onSelection?.(newSelection);
      }
    },
    [selection, onSelection]
  );

  const clearSelection = useCallback(() => {
    if (selection !== null) {
      setSelection(null);
      onSelection?.(null);
    }
  }, [selection, onSelection]);

  const endSelection = useCallback(
    (finalSelection: TileSelection | null) => {
      onSelectionEnd?.(finalSelection);
      setSelection(null);
    },
    [onSelectionEnd]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    assertExists(canvas, 'canvas');

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
            updateSelection(hits[0], hits[0]);
          } else {
            clearSelection();
          }
        },
        mousemove(e: MouseEvent) {
          if (!selection || e.altKey) {
            return;
          }
          const hits = store.query(search(e));
          if (hits.length > 0) {
            updateSelection(selection.anchor, hits[0]);
          }
        },
        mouseup(e: MouseEvent) {
          if (e.altKey) {
            return;
          }
          endSelection(selection);
        },
        keydown(e: KeyboardEvent) {
          if (selection && e.key === 'Escape') {
            // Cancel selection
            endSelection(null);
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
  }, [
    canvasRef,
    store,
    onSelection,
    onSelectionEnd,
    onAltClick,
    tileSize,
    clearSelection,
    endSelection,
    selection,
    updateSelection,
  ]);

  return null;
}
