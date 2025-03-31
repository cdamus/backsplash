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

import { ForwardedRef, useEffect, useMemo, useRef } from 'react';
import { TileParametersModel } from '../model/backsplash-model';
import { layout, TileRect } from '../model/geometry';
import { Tile, TileRow } from '../model/tile-generator';
import { getEffectiveBackgroundColor } from '../utils/style-utils';
import { assertExists } from '../utils/type-utils';
import { Box, QuadTree } from 'js-quadtree';
import TileSelectionManager, { Hit, TileSelection } from './Selection';

export type TileCanvasProps = {
  model: TileParametersModel;
  rows: Readonly<TileRow[]>;
  width?: number;
  height?: number;
  magnification?: number;
  basisFactor?: number;
  tileText?: (tile: Tile) => string;
  onTileSelection?: (tileSelection: TileSelection) => void;
  onHoleRemoval?: (hit: Hit) => void;
} & React.CanvasHTMLAttributes<HTMLCanvasElement>;

export default function TileCanvas({
  model,
  rows,
  onTileSelection,
  onHoleRemoval,
  width,
  height,
  basisFactor = 1,
  magnification = 100,
  tileText,
  ref: forwardedRef,
  ...props
}: TileCanvasProps & { ref?: ForwardedRef<HTMLCanvasElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { basisPx, canvasSize, cellSize, locate, intersectWithHoles } = useMemo(
    () => layout(basisFactor, magnification, model, rows),
    [basisFactor, magnification, model, rows]
  );
  const quadtree = useMemo(() => new QuadTree(new Box(0, 0, canvasSize.width, canvasSize.height)), [canvasSize]);

  const paintRef = useRef<(selection: TileSelection | null) => void>(() => undefined);
  const selectionDashOffsetRef = useRef(0);
  const selectionRef = useRef<TileSelection | null>(null);
  const selectionAnimationRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const supportsSelection = onTileSelection !== undefined;

  useEffect(() => {
    if (typeof forwardedRef === 'function') {
      forwardedRef(canvasRef.current);
    } else if (forwardedRef) {
      forwardedRef.current = canvasRef.current;
    }

    // Map out the tiles in the quadtree for hit testing in hole selections
    const tileMap = new Map<Tile, TileRect | null>();
    for (const row of rows) {
      for (const tile of row.columns) {
        const rect = intersectWithHoles(locate(row.key, tile.key));
        if (rect) {
          tileMap.set(tile, rect);
          const centre = rect.centre;
          const store = { x: centre.x, y: centre.y, data: tile };
          quadtree.insert(store);
        }
      }
    }

    const canvas = canvasRef.current;
    assertExists(canvas, 'canvas');

    const ctx = canvas.getContext('2d');
    assertExists(ctx, 'canvas graphics context');

    const holeStyle = getEffectiveBackgroundColor(canvas);

    function setupTransform(ctx: CanvasRenderingContext2D) {
      ctx.resetTransform();
      if (width !== undefined || height !== undefined) {
        const widthFactor = width ? width / canvasSize.width : undefined;
        const heightFactor = height ? height / canvasSize.height : undefined;
        const scaleFactor =
          widthFactor && heightFactor ? Math.min(widthFactor, heightFactor) : widthFactor ? widthFactor : heightFactor;
        if (scaleFactor !== undefined) {
          ctx.scale(scaleFactor, scaleFactor);
        }
      }

      if (supportsSelection) {
        // Make space for the selection rubber band at the edges
        ctx.translate(basisPx / 2, basisPx / 2);
      }
    }

    function paintHoles(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = holeStyle;
      for (const hole of model.holes) {
        const holeRect = locate(hole.startRow, hole.startColumn, hole.endRow, hole.endColumn, false);
        holeRect.fillInto(ctx);
      }
    }

    function paintSelection(ctx: CanvasRenderingContext2D, selection: TileSelection) {
      ctx.save();
      ctx.fillStyle = '#bfdfffaf';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = '#4f8fffaf';

      const selectionRect = locate(
        selection.anchor.data.row,
        selection.anchor.data.key,
        selection.head.data.row,
        selection.head.data.key
      );
      selectionRect.drawRoundRectInto(ctx, basisPx, true, selectionDashOffsetRef.current);
      selectionDashOffsetRef.current = (selectionDashOffsetRef.current + 1) % 9;
      ctx.restore();
    }

    function blankCanvas(ctx: CanvasRenderingContext2D) {
      if (supportsSelection) {
        ctx.clearRect(-basisPx / 2, -basisPx / 2, ctx.canvas.width, ctx.canvas.height);
      } else {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    }

    // We either paint text or paint colours
    if (tileText) {
      paintRef.current = () => {
        setupTransform(ctx);
        blankCanvas(ctx);

        ctx.font = `normal ${basisPx}px monospace`;
        ctx.fillStyle = 'black';

        for (const row of rows) {
          for (const tile of row.columns) {
            const rect = tileMap.get(tile);
            if (!rect) {
              continue; // In a hole. Nothing to paint
            }

            const text = tileText(tile);

            // Centre the text
            let { x, y } = rect.centre;
            const metrics = ctx.measureText(text);

            y += metrics.actualBoundingBoxAscent / 2;
            x -= metrics.actualBoundingBoxRight / 2;

            ctx.fillText(text, x, y);
          }
        }

        paintHoles(ctx);
      };
    } else {
      paintRef.current = (selection: TileSelection | null) => {
        setupTransform(ctx);
        blankCanvas(ctx);

        const colourMap = model.colourModel.reduce((map, colour) => {
          map[colour.name] = colour.hexcode;
          return map;
        }, {} as Record<string, string>);

        // First, paint the grout
        ctx.fillStyle = model.grout;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        for (const row of rows) {
          for (const tile of row.columns) {
            const rect = tileMap.get(tile);
            if (!rect) {
              continue; // In a hole. Nothing to paint
            }

            ctx.fillStyle = colourMap[tile.colour];

            rect.fillInto(ctx);
          }
        }

        paintHoles(ctx);

        if (selection) {
          paintSelection(ctx, selection);
        }
      };
    }

    paintRef.current(null);
  }, [
    model,
    rows,
    tileText,
    width,
    height,
    forwardedRef,
    canvasSize,
    locate,
    intersectWithHoles,
    basisPx,
    quadtree,
    selectionDashOffsetRef,
    selectionAnimationRef,
    supportsSelection,
  ]);

  function onSelection(selection: TileSelection | null) {
    selectionRef.current = selection;
    if (selection && paintRef.current && !selectionAnimationRef.current) {
      paintRef.current(selection);
      selectionAnimationRef.current = setInterval(() => paintRef.current(selectionRef.current), 83);
    }
  }

  function onSelectionEnd(selection: TileSelection | null) {
    clearInterval(selectionAnimationRef.current);
    selectionAnimationRef.current = undefined;
    selectionRef.current = null;
    if (selection && onTileSelection) {
      onTileSelection(selection);
    } else {
      // Paint away the selection indicator
      paintRef.current(null);
    }
  }

  function onAltClick(hit: Hit) {
    if (hit && onHoleRemoval) {
      onHoleRemoval(hit);
    }
  }

  let canvasScalingProps: { width: number; height: number };
  if (width !== undefined && height !== undefined) {
    // Maintain aspect ratio
    const scaleW = (canvasSize.width * height) / canvasSize.height;
    const scaleH = (canvasSize.height * width) / canvasSize.width;
    if (scaleW < width) {
      canvasScalingProps = { width: scaleW, height };
    } else {
      canvasScalingProps = { width, height: scaleH };
    }
  } else if (width !== undefined) {
    const scaleH = (canvasSize.height * width) / canvasSize.width;
    canvasScalingProps = {
      width,
      height: scaleH,
    };
  } else if (height !== undefined) {
    const scaleW = (canvasSize.width * height) / canvasSize.height;
    canvasScalingProps = {
      width: scaleW,
      height,
    };
  } else {
    canvasScalingProps = {
      width: canvasSize.width,
      height: canvasSize.height,
    };
  }

  if (supportsSelection) {
    // Make space for the selection rubber band at the edges
    canvasScalingProps = {
      width: canvasScalingProps.width + basisPx,
      height: canvasScalingProps.height + basisPx,
    };
  }

  return (
    <>
      <canvas {...props} ref={canvasRef} {...canvasScalingProps} />
      {onTileSelection ? (
        <TileSelectionManager
          canvasRef={canvasRef}
          store={quadtree}
          tileSize={cellSize}
          onSelection={onSelection}
          onSelectionEnd={onSelectionEnd}
          onAltClick={onAltClick}
        />
      ) : null}
    </>
  );
}
