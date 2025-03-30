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

import { sortBy, sum } from 'lodash';
import seedrandom from 'seedrandom';
import { assertExists } from '../utils/type-utils';
import { TileParametersModel } from './backsplash-model';
import { ColourWeight } from './colour-model';

type Random = seedrandom.PRNG;

export type Tile = Readonly<{
  key: number;
  row: number;
  colour: string;
}>;

export type TileRow = {
  key: number;
  columns: Tile[];
};

/** A supplier of random numbers and shuffles. */
class Randomizer {
  private readonly rnd: Random;

  constructor(seed: string) {
    this.rnd = seedrandom(seed);
  }

  /** Get the next random real between 0 and 1. */
  next() {
    return this.rnd();
  }

  /** Get the next random non-negative integer. */
  nextInt() {
    return Math.abs(this.rnd.int32());
  }

  /** Randomly shuffle some `items`. */
  shuffle<T>(items: T[]) {
    if (!items.length) {
      return items;
    }
    const supply = [...items];
    const result = [];
    while (supply.length > 1) {
      const next = this.nextInt() % supply.length;
      const [item] = supply.splice(next, 1);
      result.push(item);
    }
    result.push(supply[0]);
    return result;
  }

  /**
   * Shuffle some `items` on a weighted random distribution.
   * Items with higher weights are more likely to appear earlier in the shuffle.
   */
  weightedShuffle<T extends PropertyKey>(items: T[], weights: Record<T, number>) {
    const values = Object.values(weights);
    const average = sum(values) / values.length;
    return sortBy(items, (item) => -this.next() * (weights[item] ?? average));
  }
}

/**
 * Endlessly dispense `colours` in random orderings of a given set.
 */
function* colourDispenser(colours: string[], rnd: Randomizer) {
  const colourCount = colours.length;
  let group: string[] = [];
  let lastColour: string | undefined;

  for (let i = 0; ; i++) {
    if (i % colourCount === 0) {
      // New group
      group = rnd.shuffle(colours);

      // Always start with a random colour different to the last of the previous group
      if (group[0] === lastColour) {
        const [colour] = group.splice(0, 1);
        group.push(colour);
      }
    }

    lastColour = group.shift();
    assertExists(lastColour);

    yield lastColour;
  }
}

/** Rotate some `items` to the right by some number of `places`. */
function rotate<T>(items: T[], places: number): T[] {
  if (places === 0) {
    return items;
  }

  const result = [...items];
  const chunk = result.splice(result.length - places);
  return [...chunk, ...result];
}

/** A generator of rows of tiles. */
class RowGenerator {
  private readonly colourSupplier: (rnd: Randomizer) => string[];

  constructor(
    private readonly model: TileParametersModel,
    colourWeights: Record<string, ColourWeight>,
    favourites: string[]
  ) {
    let colourSupplier = (rnd: Randomizer) => {
      const colours = Object.keys(colourWeights).filter((colour) => !favourites.includes(colour));

      const result = [...rnd.shuffle(favourites), ...rnd.shuffle(colours)].slice(0, model.groupSize);
      return result;
    };

    if (model.complexity > 0) {
      const baseColourSupplier = colourSupplier;
      colourSupplier = (rnd: Randomizer) => {
        // Add random duplicates, adjusted by weight
        const result = baseColourSupplier(rnd);
        const dupeCount = (rnd.nextInt() % model.complexity) % model.groupSize;
        const sorted = rnd.weightedShuffle(result, colourWeights);
        result.push(...sorted.slice(0, dupeCount));
        return result;
      };
    }

    this.colourSupplier = colourSupplier;
  }

  /** Endlessly generate randomized rows of tiles. */
  *generateRows() {
    const rnd = new Randomizer(this.model.seed);
    for (let i = this.model.rowCount; i >= 1; i--) {
      const row = this.generateRow(i, rnd);
      yield row;
    }
  }

  private generateRow(rowKey: number, rnd: Randomizer) {
    const colours = this.colourSupplier(rnd);
    const row: Tile[] = [];

    let i = 0;
    for (const colour of colourDispenser(colours, rnd)) {
      if (i >= this.model.columnCount) {
        break;
      }

      const columnKey = ((i + this.model.rotation) % this.model.columnCount) + 1;
      row.push({ key: columnKey, row: rowKey, colour });
      i++;
    }

    return { key: rowKey, columns: rotate(row, this.model.rotation) };
  }
}

/** A generator of a randomized tile backsplash pattern. */
class TileGenerator {
  private readonly rowGenerator: RowGenerator;

  constructor(model: TileParametersModel) {
    const colourWeights: Record<string, ColourWeight> = {};
    const favourites: string[] = [];

    model.colourModel
      .filter((colour) => colour.enabled)
      .forEach((colour) => {
        colourWeights[colour.name] = colour.weight;
        if (colour.favourite) {
          favourites.push(colour.name);
        }
      });

    this.rowGenerator = new RowGenerator(model, colourWeights, favourites);
  }

  /**
   * Generate the backsplash pattern as a sequence of rows from top to
   * bottom. The actual order of generation is from bottom to top so that
   * a sequence generating N+k rows has the identical bottom N rows to a
   * sequence generating just N rows.
   */
  generate() {
    const result: TileRow[] = [];

    for (const row of this.rowGenerator.generateRows()) {
      result.unshift(row);
    }

    return result;
  }
}

/**
 * Generate the backsplash pattern as a sequence of rows from top to
 * bottom. The actual order of generation is from bottom to top so that
 * a sequence generating N+k rows has the identical bottom N rows to a
 * sequence generating just N rows.
 */
export function generateRows(state: TileParametersModel) {
  const generator = new TileGenerator(state);
  const result = generator.generate();
  return result;
}
