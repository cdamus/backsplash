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

import { createContext, Dispatch } from 'react';
import { z } from 'zod';

import { isEqual } from 'lodash';
import { ColourModel, ColourPalette, colourPaletteSchema, defaultColourPalette } from './colour-model';
import { UndoManager } from './undo-redo';

function enabledCount(colourModel: ColourModel) {
  return colourModel.filter((colour) => colour.enabled).length;
}

export const regionSchema = z
  .object({
    startRow: z.number().int().nonnegative(),
    startColumn: z.number().int().nonnegative(),
    endRow: z.number().int().nonnegative(),
    endColumn: z.number().int().nonnegative(),
  })
  .readonly();

const validRatio = (value: number) => value !== 0 && value !== -1;

export const defaultParams = {
  seed: 'Oceani',
  orientation: 'horizontal',
  rowCount: 8,
  columnCount: 34,
  complexity: 1,
  aspectRatio: 4,
  offset: 2,
  stepDirection: 'right',
  stepAlternate: true,
  groupSize: enabledCount(defaultColourPalette.colourModel),
  rotation: 0,
  holes: [] as Region[],
  ...defaultColourPalette,
} as const;

export const tileParametersSchema = z
  .object({
    ...colourPaletteSchema.unwrap().shape,
    seed: z.string().default(defaultParams.seed),
    orientation: z.enum(['horizontal', 'vertical']).default(defaultParams.orientation),
    rowCount: z.number().int().positive().default(defaultParams.rowCount),
    columnCount: z.number().int().positive().default(defaultParams.columnCount),
    complexity: z.number().int().nonnegative().default(defaultParams.complexity),
    aspectRatio: z.number().int().min(-10).max(10).refine(validRatio).default(defaultParams.aspectRatio),
    offset: z.number().int().min(1).max(10).default(defaultParams.offset),
    stepDirection: z.enum(['left', 'right']).default(defaultParams.stepDirection),
    stepAlternate: z.boolean().default(defaultParams.stepAlternate),
    groupSize: z.number().int().positive().default(defaultParams.groupSize),
    rotation: z.number().int().nonnegative().default(defaultParams.rotation),
    holes: z.array(regionSchema).default(defaultParams.holes),
  })
  .readonly();

export type TileParametersModel = z.infer<typeof tileParametersSchema>;
export type StepDirection = TileParametersModel['stepDirection'];
export type Orientation = TileParametersModel['orientation'];
export type Region = z.infer<typeof regionSchema>;

type SetActions = {
  [P in keyof TileParametersModel]: { param: P; value: TileParametersModel[P] };
};

export type SetAction = {
  type: 'set';
} & SetActions[keyof TileParametersModel];

export type SetColourPaletteAction = {
  type: 'set-colour-palette';
  palette: ColourPalette;
};

export type LoadAction = {
  type: 'load';
  state: TileParametersModel;
};

export type AddHoleAction = {
  type: 'add-hole';
} & Region;

export type RemoveHoleAction = {
  type: 'remove-hole';
  row: number;
  column: number;
};

export type TileParametersAction = SetAction | SetColourPaletteAction | LoadAction | AddHoleAction | RemoveHoleAction;
export type TileParametersDispatch = Dispatch<TileParametersAction>;

export function paramsReducer(params: TileParametersModel, action: TileParametersAction) {
  switch (action.type) {
    case 'set': {
      // Handle idempotent dispatches
      if (isEqual(params[action.param], action.value)) {
        return params;
      }

      let result: TileParametersModel = { ...params };

      // Handle side-effects
      switch (action.param) {
        case 'colourModel':
          if (enabledCount(action.value) === params.groupSize) {
            result = { ...result, groupSize: enabledCount(action.value) };
          }
          break;
        default:
          // Pass
          break;
      }

      // The new param
      result = { ...result, [action.param]: action.value };
      return result;
    }
    case 'set-colour-palette':
      return { ...params, ...action.palette };
    case 'load':
      return action.state;
    case 'add-hole': {
      const { type: _, ...hole } = action;
      return { ...params, holes: [...params.holes, hole] };
    }
    case 'remove-hole': {
      const { row, column } = action;
      const holes = params.holes.filter((hole) => !_isInHole(row, column, hole));
      return { ...params, holes };
    }
    default:
      return params;
  }
}

export type TileModelContext = {
  state: TileParametersModel;
  dispatch: TileParametersDispatch;
  undoManager: UndoManager;
};

export const TileModelContext = createContext<TileModelContext>({
  state: defaultParams,
  dispatch() {
    throw new Error('Model dispatch not implemented.');
  },
  undoManager: {
    undo() {
      throw new Error('Undo not implemented.');
    },
    redo() {
      throw new Error('Redo not implemented.');
    },
    canUndo: false,
    canRedo: false,
  } as const,
});

export function isInHole(row: number, column: number, model: TileParametersModel): boolean {
  return model.holes.some((hole) => _isInHole(row, column, hole));
}

function _isInHole(row: number, column: number, hole: Region): boolean {
  return row >= hole.startRow && row <= hole.endRow && column >= hole.startColumn && column <= hole.endColumn;
}
