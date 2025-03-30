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

import _IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import _TextField from '@mui/material/TextField';
import ZoomOutMapOutlinedIcon from '@mui/icons-material/ZoomOutMapOutlined';
import ZoomInOutlinedIcon from '@mui/icons-material/ZoomInOutlined';
import ZoomOutOutlinedIcon from '@mui/icons-material/ZoomOutOutlined';
import { debounce } from 'lodash';
import { Resizable } from 're-resizable';
import { use, useEffect, useMemo, useState, WheelEvent } from 'react';
import { macos as isMac } from 'platform-detect';
import { TileModelContext } from '../model/backsplash-model';
import { generateRows, TileRow } from '../model/tile-generator';
import { Hit, TileSelection } from './Selection';
import _TileCanvas from './TileCanvas';
import { withTooltip } from './tooltip-support';

const MIN_MAGNIFICATION_PCT = 1;
const MAX_MAGNIFICATION_PCT = 4000;

const SAVED_MAGNIFICATION_KEY = 'ca.damus.backsplash:magnification';

const IconButton = withTooltip(_IconButton);
const TextField = withTooltip(_TextField);
const TileCanvas = withTooltip(_TileCanvas);

const THTMLInput = withTooltip(function ({
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ref: React.ForwardedRef<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
});

function clampMagnification(magnification: number) {
  if (isNaN(magnification)) {
    return 100;
  }

  return Math.ceil(Math.min(Math.max(magnification, MIN_MAGNIFICATION_PCT), MAX_MAGNIFICATION_PCT));
}

function loadMagnification() {
  const magnification = Number(window.localStorage.getItem(SAVED_MAGNIFICATION_KEY) ?? '100');

  return clampMagnification(magnification);
}

const saveMagnification = debounce((magnification: number) => {
  window.localStorage.setItem(SAVED_MAGNIFICATION_KEY, String(clampMagnification(magnification)));
}, 1000);

export default function Backsplash() {
  const [magnification, setMagnification] = useState(loadMagnification());

  useEffect(() => {
    saveMagnification(magnification);
  }, [magnification]);

  const { state, dispatch } = use(TileModelContext);
  const rows = useMemo<TileRow[]>(() => {
    const result = generateRows(state);
    return result;
  }, [state]);

  const zoomIn = () => setMagnification(magnification * 2);
  const zoomOut = () => setMagnification(Math.ceil(magnification / 2));
  const canZoomIn = magnification < 2000;
  const canZoomOut = magnification >= 2;

  const updateMagnification = (value: string) => {
    const newMagnification = Number(value);
    setMagnification(clampMagnification(newMagnification));
  };

  const zoomReset = () => updateMagnification('100');

  const wheelZoom = (event: WheelEvent) => {
    event.preventDefault();

    if (!event.ctrlKey) {
      return;
    }

    let newMagnification = magnification;
    switch (event.deltaMode) {
      case 1: // Lines
        newMagnification += event.deltaY * 1;
        break;
      case 2: // Pages
        newMagnification += event.deltaY * 100;
        break;
      default:
        newMagnification += event.deltaY;
        break;
    }
    setMagnification(clampMagnification(newMagnification));
  };

  const onTileSelection = (selection: TileSelection) => {
    const startRow = Math.min(selection.anchor.data.row, selection.head.data.row);
    const startColumn = Math.min(selection.anchor.data.key, selection.head.data.key);
    const endRow = Math.max(selection.anchor.data.row, selection.head.data.row);
    const endColumn = Math.max(selection.anchor.data.key, selection.head.data.key);
    dispatch({ type: 'add-hole', startRow, startColumn, endRow, endColumn });
  };

  const onHoleRemoval = (hit: Hit) => {
    dispatch({ type: 'remove-hole', row: hit.data.row, column: hit.data.key });
  };

  return (
    <Paper className="tiles" elevation={2}>
      <Resizable enable={{ bottom: true }}>
        <Stack direction="column" alignItems="center" height="100%" justifyContent="space-between" onWheel={wheelZoom}>
          <div className="backsplash">
            <TileCanvas
              model={state}
              rows={rows}
              tooltip={`Select regions with the mouse to draw holes in the layout for windows and cabinets. ${
                isMac ? 'Option' : 'Alt'
              }-click on a hole to remove it.`}
              magnification={magnification}
              onTileSelection={onTileSelection}
              onHoleRemoval={onHoleRemoval}
            />
          </div>
          <Stack direction="row" id="magnification-controls">
            <IconButton
              aria-label="zoom out"
              color="primary"
              onClick={zoomOut}
              disabled={!canZoomOut}
              tooltip="Zoom out to see more of the backsplash layout."
            >
              <ZoomOutOutlinedIcon />
            </IconButton>
            <TextField
              id="magnification"
              variant="outlined"
              value={magnification}
              type="number"
              size="small"
              onChange={(e) => updateMagnification(e.target.value)}
              slots={{ htmlInput: THTMLInput }}
              slotProps={{
                htmlInput: { tooltip: 'Set the magnification of the backsplash layout view.' },
                input: {
                  endAdornment: (
                    <>
                      <InputAdornment position="end">%</InputAdornment>
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="reset zoom"
                          color="primary"
                          tooltip="Reset the magnification of the backsplash layout to normal size."
                          onClick={zoomReset}
                          disabled={magnification === 100}
                        >
                          <ZoomOutMapOutlinedIcon />
                        </IconButton>
                      </InputAdornment>
                    </>
                  ),
                },
              }}
            />
            <IconButton
              aria-label="zoom in"
              color="primary"
              onClick={zoomIn}
              disabled={!canZoomIn}
              tooltip="Zoom in to see less of the backsplash layout."
            >
              <ZoomInOutlinedIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Resizable>
    </Paper>
  );
}
