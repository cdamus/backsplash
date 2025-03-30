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

import { memoize } from 'lodash';
import { Region, TileParametersModel } from '../model/backsplash-model';
import { TileRow } from './tile-generator';

export class TilePoint {
  constructor(readonly x: number, readonly y: number) {}

  withX(x: number) {
    return new TilePoint(x, this.y);
  }

  withY(y: number) {
    return new TilePoint(this.x, y);
  }

  get [0]() {
    return this.x;
  }
  get [1]() {
    return this.y;
  }

  [Symbol.iterator]() {
    return ([this.x, this.y] as const)[Symbol.iterator]();
  }
}

export class TileRect implements Iterable<number> {
  constructor(readonly x: number, readonly y: number, readonly width: number, readonly height: number) {}

  get centre() {
    return new TilePoint(this.x + this.width / 2, this.y + this.height / 2);
  }

  get left() {
    return this.x;
  }

  withLeft(left: number) {
    return new TileRect(left, this.y, this.right - left, this.height);
  }

  get top() {
    return this.y;
  }

  withTop(top: number) {
    return new TileRect(this.x, top, this.width, this.bottom - top);
  }

  get right() {
    return this.x + this.width;
  }

  withRight(right: number) {
    return new TileRect(this.x, this.y, right - this.left, this.height);
  }

  get bottom() {
    return this.y + this.height;
  }

  withBottom(bottom: number) {
    return new TileRect(this.x, this.y, this.width, bottom - this.top);
  }

  get leftMiddle() {
    return new TilePoint(this.left, this.top + this.height / 2);
  }

  get topMiddle() {
    return new TilePoint(this.left + this.width / 2, this.top);
  }

  get rightMiddle() {
    return new TilePoint(this.right, this.top + this.height / 2);
  }

  get bottomMiddle() {
    return new TilePoint(this.left + this.width / 2, this.bottom);
  }

  get size() {
    return new TileSize(this.width, this.height);
  }

  contains(point: TilePoint) {
    return point.x >= this.left && point.x <= this.right && point.y >= this.top && point.y <= this.bottom;
  }

  union(other: TileRect) {
    const left = Math.min(this.left, other.left);
    const top = Math.min(this.top, other.top);
    const right = Math.max(this.right, other.right);
    const bottom = Math.max(this.bottom, other.bottom);
    return new TileRect(left, top, right - left, bottom - top);
  }

  intersect(other: TileRect) {
    const left =
      other.contains(this.leftMiddle) && other.contains(this.topMiddle) && other.contains(this.bottomMiddle)
        ? Math.max(this.left, other.right)
        : this.left;
    const top =
      other.contains(this.topMiddle) && other.contains(this.leftMiddle) && other.contains(this.rightMiddle)
        ? Math.max(this.top, other.bottom)
        : this.top;
    const right =
      other.contains(this.rightMiddle) && other.contains(this.topMiddle) && other.contains(this.bottomMiddle)
        ? Math.min(this.right, other.left)
        : this.right;
    const bottom =
      other.contains(this.bottomMiddle) && other.contains(this.leftMiddle) && other.contains(this.rightMiddle)
        ? Math.min(this.bottom, other.top)
        : this.bottom;

    if (left >= right || top >= bottom) {
      return null;
    } else if (left === this.left && top === this.top && right === this.right && bottom === this.bottom) {
      return this;
    } else {
      return new TileRect(left, top, right - left, bottom - top);
    }
  }

  fillInto(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  drawRoundRectInto(ctx: CanvasRenderingContext2D, basisPx: number, stroke = false, outlineOffset = 0) {
    const x = this.x - basisPx / 2;
    const y = this.y - basisPx / 2;
    const width = this.width + basisPx;
    const height = this.height + basisPx;
    const radius = basisPx;

    ctx.beginPath();
    ctx.moveTo(x + radius + outlineOffset, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    if (outlineOffset) {
      ctx.lineTo(x + radius + outlineOffset, y);
    }
    ctx.closePath();
    ctx.fill(); // Fill the shape

    if (stroke) {
      ctx.stroke(); // And outline it
    }
  }

  get [0]() {
    return this.x;
  }
  get [1]() {
    return this.y;
  }
  get [2]() {
    return this.width;
  }
  get [3]() {
    return this.height;
  }

  [Symbol.iterator]() {
    const result = ([this.x, this.y, this.width, this.height] as const)[Symbol.iterator]();
    return result;
  }
}

export class TileSize implements Iterable<number> {
  constructor(readonly width: number, readonly height: number) {}

  withWidth(width: number) {
    return new TileSize(width, this.height);
  }

  withHeight(height: number) {
    return new TileSize(this.width, height);
  }

  get [0]() {
    return this.width;
  }
  get [1]() {
    return this.height;
  }

  toRect() {
    return new TileRect(0, 0, this.width, this.height);
  }

  [Symbol.iterator]() {
    return [this.width, this.height][Symbol.iterator]();
  }
}

export function layout(
  basisFactor: number,
  magnification: number,
  model: TileParametersModel,
  rows: readonly TileRow[]
) {
  const basisPx = (16 * magnification) / 100;
  const groutPx = 2;

  function measure(rows: number, columns: number, inside = false) {
    const groutX = (columns + (inside ? -1 : +1)) * groutPx;
    const groutY = (rows + (inside ? -1 : +1)) * groutPx;

    return new TileSize(
      (model.aspectRatio < 0 ? columns * basisPx : columns * basisPx * model.aspectRatio * basisFactor) + groutX,
      (model.aspectRatio > 0 ? rows * basisPx : -rows * basisPx * model.aspectRatio * basisFactor) + groutY
    );
  }

  const cellSize = measure(1, 1, true);

  function locateCell(row: number, column: number, inside = true) {
    // Model indexing is 1-based
    const tileX = column - 1;
    const tileY = row - 1;
    let width = cellSize.width + (inside ? 0 : 2 * groutPx);
    let height = cellSize.height + (inside ? 0 : 2 * groutPx);
    let x = tileX * cellSize.width + (inside ? column : tileX) * groutPx;
    let y = tileY * cellSize.height + (inside ? row : tileY) * groutPx;

    const { aspectRatio, offset, orientation, stepAlternate, stepDirection } = model;
    if (offset > 1) {
      const amount =
        orientation === 'vertical'
          ? aspectRatio > 0
            ? 1
            : -aspectRatio * basisFactor
          : aspectRatio > 0
          ? aspectRatio * basisFactor
          : 1;
      const index = orientation === 'vertical' ? tileX : tileY;

      // In vertical orientation, "left" is "down"
      const direction = stepDirection === 'right' || offset <= 2 ? -1 : +1;

      if (stepAlternate || offset <= 2) {
        if (index % 2 === 1) {
          if (orientation === 'horizontal') {
            x += (direction * basisPx * amount) / offset;
          } else {
            y += (direction * basisPx * amount) / offset;
          }
        }
      } else {
        const modularOffset = (index % offset) - (stepDirection === 'right' ? 0 : offset - 1);
        if (orientation === 'horizontal') {
          x += (direction * basisPx * amount * modularOffset) / offset;
        } else {
          y += (direction * basisPx * amount * modularOffset) / offset;
        }
      }

      if (orientation === 'horizontal') {
        if (x < groutPx) {
          width -= inside ? groutPx - x : -x;
          x = inside ? groutPx : 0;
        }
      } else {
        if (y < groutPx) {
          height -= inside ? groutPx - y : -y;
          y = inside ? groutPx : 0;
        }
      }
    }

    return new TileRect(x, y, width, height);
  }

  // the locator function for a tile or an area
  function locate(row: number, column: number, toRow = row, toColumn = column, inside = true) {
    const start = locateCell(row, column, inside);
    const end = locateCell(toRow, toColumn, inside);

    return start.union(end);
  }

  const locateHole = memoize((hole: Region) => locate(hole.startRow, hole.startColumn, hole.endRow, hole.endColumn));

  function intersectWithHoles(tile: TileRect) {
    let result = canvasCrop
      ? canvasCrop.reduce<TileRect | null>((tile, crop) => (tile ? tile.intersect(crop) : tile), tile)
      : tile;

    if (result) {
      model.holes.forEach((hole) => {
        const holeRect = locateHole(hole);
        const intersected = result!.intersect(holeRect);
        if (!intersected) {
          return intersected; // Nothing left
        }
        result = intersected;
      });
    }

    return result;
  }

  const { canvasSize, canvasCrop } = (function () {
    const fullCanvas = measure(model.rowCount, model.columnCount);
    if (model.offset > 1) {
      // Compute the size of the canvas, trimming off the ragged right or bottom edge according to the orientation
      if (model.orientation === 'horizontal') {
        const canvasCrop: TileRect[] = [];
        const left = rows
          .map((row) => row.columns.at(0)!)
          .reduce((max, tile) => Math.max(locateCell(tile.row, tile.key, false).left, max), 0);
        const right = rows
          .map((row) => row.columns.at(-1)!)
          .reduce((min, tile) => Math.min(locateCell(tile.row, tile.key, false).right, min), fullCanvas.width);
        const canvasSize = fullCanvas.withWidth(right - left);

        if (left > 0) {
          canvasCrop.push(new TileRect(0, 0, left, fullCanvas.height));
        }
        if (right < fullCanvas.width) {
          canvasCrop.push(new TileRect(right, 0, fullCanvas.width - right, canvasSize.height));
        }
        return { canvasSize, canvasCrop };
      } else {
        const canvasCrop: TileRect[] = [];
        const top = rows
          .at(0)!
          .columns.reduce((max, tile) => Math.max(locateCell(tile.row, tile.key, false).top, max), 0);
        const bottom = rows
          .at(-1)!
          .columns.reduce(
            (min, tile) => Math.min(locateCell(tile.row, tile.key, false).bottom, min),
            fullCanvas.height
          );
        const canvasSize = fullCanvas.withHeight(bottom - top);

        if (top > 0) {
          canvasCrop.push(new TileRect(0, 0, fullCanvas.width, top));
        }
        if (bottom < fullCanvas.height) {
          canvasCrop.push(new TileRect(0, bottom, fullCanvas.width, fullCanvas.height - bottom));
        }
        return { canvasSize, canvasCrop };
      }
    } else {
      const canvasSize = fullCanvas;
      const canvasCrop = null;
      return { canvasSize, canvasCrop };
    }
  })();

  return { basisPx, canvasSize, cellSize, measure, locate, intersectWithHoles };
}
