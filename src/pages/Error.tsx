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

import Typography from '@mui/material/Typography';
import { use } from 'react';
import BackButton from '../components/BackButton';
import TopBar from '../components/TopBar';
import { ErrorContext } from '../utils/error-context';

export default function ErrorPage() {
  const error = use(ErrorContext);

  return (
    <>
      <TopBar left={BackButton} />
      <div className="error">
        <Typography variant="h3">Error{error ? '' : '?'}</Typography>
        {error ? (
          <ErrorDisplay error={error} />
        ) : (
          <Typography variant="body1">Everything appears to be functioning normally.</Typography>
        )}
      </div>
    </>
  );
}

function ErrorDisplay({ error }: { error: Error }) {
  return (
    <>
      <Typography variant="body1">{error.message ?? 'An error occurred.'}</Typography>
      {error.stack ? <pre>{error.stack}</pre> : null}
    </>
  );
}
