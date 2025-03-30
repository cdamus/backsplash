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

import { z } from 'zod';
import { KeysOfType } from '../utils/type-utils';

const colourWeightSchema = z.number().int().min(1).max(9).readonly();
export type ColourWeight = z.infer<typeof colourWeightSchema>;

const hexcolourSchema = z.string().regex(/#[0-9a-fA-F]{6}/);

export const colourSpecSchema = z
  .object({
    name: z.string(),
    hexcode: hexcolourSchema,
    code: z.string().length(1),
    enabled: z.boolean(),
    weight: colourWeightSchema,
    favourite: z.boolean(),
  })
  .readonly();

export type ColourSpec = z.infer<typeof colourSpecSchema>;

export const colourModelSchema = z.array(colourSpecSchema).readonly();
export type ColourModel = z.infer<typeof colourModelSchema>;

export const defaultColourPalette = {
  grout: '#e8ece4',
  // prettier-ignore
  colourModel: [
    { name: 'cherry', hexcode: '#8b314d', code: 'C', enabled: true, weight: 5, favourite: false },
    { name: 'pink', hexcode: '#a9929d', code: 'I', enabled: false, weight: 5, favourite: false },
    { name: 'jeans', hexcode: '#90a5bc', code: 'J', enabled: true, weight: 5, favourite: false },
    { name: 'smoke', hexcode: '#91949b', code: 'S', enabled: true, weight: 5, favourite: false },
    { name: 'pearl', hexcode: '#c5c9cc', code: 'P', enabled: true, weight: 5, favourite: true },
    { name: 'emerald', hexcode: '#2c6278', code: 'E', enabled: false, weight: 5, favourite: false },
    { name: 'maldive', hexcode: '#478fa9', code: 'M', enabled: false, weight: 5, favourite: false },
    { name: 'aequa', hexcode: '#6d9da0', code: 'A', enabled: false, weight: 5, favourite: false },
    { name: 'green', hexcode: '#314d50', code: 'G', enabled: false, weight: 5, favourite: false },
    { name: 'blue', hexcode: '#2f657c', code: 'B', enabled: false, weight: 5, favourite: false },
    { name: 'black', hexcode: '#1d2322', code: 'K', enabled: false, weight: 5, favourite: false },
  ] as const,
} as const;

export const colourPaletteSchema = z
  .object({
    grout: hexcolourSchema.default(defaultColourPalette.grout),
    colourModel: colourModelSchema.default(defaultColourPalette.colourModel),
  })
  .readonly();
export type ColourPalette = z.infer<typeof colourPaletteSchema>;

export type SetGroutAction = { type: 'set-grout'; colour: string };
export type AddColourAction = { type: 'add-colour'; colour: ColourSpec };
export type DeleteColourAction = { type: 'delete-colour'; colourName: string };
export type ChangeColourAction = {
  type: 'change-colour';
  colourName: string;
  hexcode: string;
};
export type ToggleColourAction = { type: 'toggle-colour'; colourName: string };
export type ToggleFavouriteAction = { type: 'toggle-fave'; colourName: string };
export type WeightColourAction = {
  type: 'weight-colour';
  colourName: string;
  delta: -1 | 1;
};
export type SetColourModelAction = { type: 'set-colour-model'; model: ColourModel };
export type ColourAction =
  | SetGroutAction
  | AddColourAction
  | DeleteColourAction
  | ChangeColourAction
  | ToggleColourAction
  | ToggleFavouriteAction
  | WeightColourAction
  | SetColourModelAction;

function setColourModel(palette: ColourPalette, model: ColourModel): ColourPalette {
  return colourPaletteReducer(palette, { type: 'set-colour-model', model });
}

function toggle(palette: ColourPalette, colourName: string, prop: KeysOfType<boolean, ColourSpec>): ColourPalette {
  return setColourModel(
    palette,
    palette.colourModel.map((colour) =>
      colour.name !== colourName
        ? colour
        : {
            ...colour,
            [prop]: !colour[prop],
          }
    )
  );
}

export function colourPaletteReducer(palette: ColourPalette, action: ColourAction) {
  switch (action.type) {
    case 'set-grout':
      return { grout: action.colour, colourModel: palette.colourModel };
    case 'set-colour-model':
      return { ...palette, colourModel: action.model };
    case 'add-colour':
      return setColourModel(palette, [...palette.colourModel, action.colour]);
    case 'delete-colour':
      return setColourModel(
        palette,
        palette.colourModel.filter((colour) => colour.name !== action.colourName)
      );
    case 'change-colour':
      return setColourModel(
        palette,
        palette.colourModel.map((colour) =>
          colour.name !== action.colourName
            ? colour
            : {
                ...colour,
                hexcode: action.hexcode,
              }
        )
      );
    case 'toggle-colour':
      return toggle(palette, action.colourName, 'enabled');
    case 'toggle-fave':
      return toggle(palette, action.colourName, 'favourite');
    case 'weight-colour':
      return setColourModel(
        palette,
        palette.colourModel.map((colour) =>
          colour.name !== action.colourName
            ? colour
            : {
                ...colour,
                weight: Math.min(9, Math.max(1, colour.weight + action.delta)),
              }
        )
      );
    default:
      return palette;
  }
}
