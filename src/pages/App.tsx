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

import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Navigate, Outlet } from 'react-router';
import ModelScope from '../components/ModelScope';
import { UndoContext } from '../model/undo-redo';
import { ErrorContext } from '../utils/error-context';

export default function App() {
  const [error, setError] = useState<Error | null>(null);
  const undoContext = useMemo(() => ({ undoStack: [], redoStack: [] }), []);

  return (
    <div className="App">
      <ErrorBoundary onError={setError} FallbackComponent={ErrorNavigator}>
        <ErrorContext value={error}>
          <MantineProvider>
            <UndoContext value={undoContext}>
              <ModelScope>
                <Outlet />
              </ModelScope>
            </UndoContext>
          </MantineProvider>
        </ErrorContext>
      </ErrorBoundary>
    </div>
  );
}

function ErrorNavigator({ error, resetErrorBoundary }: FallbackProps) {
  useEffect(resetErrorBoundary, [resetErrorBoundary]);

  return error ? <Navigate to="/error" /> : <div />;
}
