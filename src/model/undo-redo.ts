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

import { debounce } from 'lodash';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { TileParametersDispatch, TileParametersModel } from './backsplash-model';

export const UndoContext = createContext({
  undoStack: new Array<TileParametersModel>(),
  redoStack: new Array<TileParametersModel>(),
});

export type Undo = () => void;
export type Redo = () => void;

export type UndoManager = {
  undo: Undo;
  redo: Redo;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
};

export function useUndoRedo(state: TileParametersModel, dispatch: TileParametersDispatch) {
  const { undoStack, redoStack } = use(UndoContext);
  const [canUndo, setCanUndo] = useState(undoStack.length > 1);
  const [canRedo, setCanRedo] = useState(redoStack.length > 0);

  const pushUndo = useMemo(
    () =>
      debounce((undoState: TileParametersModel) => {
        if (undoStack) {
          undoStack.push(undoState);
          if (undoStack.length > 1000) {
            undoStack.splice(0, undoStack.length - 1000);
          }
          setCanUndo(undoStack.length > 1);
        }
        if (redoStack) {
          redoStack.length = 0;
          setCanRedo(false);
        }
      }, 350),
    [undoStack, redoStack],
  );

  useEffect(() => {
    const undoState = undoStack.at(-1);
    const redoState = redoStack.at(-1);
    if ((!undoState && !redoState) || (undoState !== state && redoState !== state)) {
      pushUndo(state);
    }
  }, [state, pushUndo, undoStack, redoStack]);

  const undo = useCallback(() => {
    if (!canUndo) {
      return;
    }

    const redoState = undoStack.pop();
    if (redoState) {
      redoStack.push(redoState);
      setCanRedo(true);
    }

    const undoState = undoStack.at(-1);
    if (undoState) {
      dispatch({ type: 'load', state: undoState });
    }
    setCanUndo(undoStack.length > 1);
  }, [dispatch, undoStack, redoStack, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) {
      return;
    }

    const undoState = redoStack.pop();
    if (undoState) {
      undoStack.push(undoState);
      dispatch({ type: 'load', state: undoState });
      setCanUndo(true);
    }
    setCanRedo(redoStack.length > 0);
  }, [dispatch, undoStack, redoStack, canRedo]);

  useEffect(() => {
    const undoRedoKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'z' && e.metaKey) {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', undoRedoKeyHandler);
    return () => window.removeEventListener('keydown', undoRedoKeyHandler);
  }, [undo, redo]);

  const result = { undo, redo, canUndo, canRedo } satisfies UndoManager;

  return result;
}
