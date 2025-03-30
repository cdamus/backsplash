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

import { FileButton } from '@mantine/core';
import UploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import RedoIcon from '@mui/icons-material/Redo';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import _Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid2';
import _IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Slider, { SliderProps } from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch, { SwitchProps } from '@mui/material/Switch';
import _TextField from '@mui/material/TextField';
import { countBy } from 'lodash';
import { use, useCallback, useRef, useState } from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import { useMutationObserver } from '../hooks/use-mutation-observer';
import { SetAction, TileModelContext, TileParametersModel, tileParametersSchema } from '../model/backsplash-model';
import { DialogApi } from '../utils/dialog-utils';
import { hasProperty } from '../utils/type-utils';
import ColourDialog from './ColourDialog';
import ConfigurationManager from './ConfigurationManager';
import { withTooltip } from './tooltip-support';

const Button = withTooltip(_Button);
const IconButton = withTooltip(_IconButton);
const TextField = withTooltip(_TextField);

export default function Settings() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { state, dispatch, undoManager } = use<TileModelContext>(TileModelContext);
  const [popoverAnchor, setPopoverAnchor] = useState<Element | null>(null);
  const dialog = useRef<DialogApi | null>(null);
  const { showBoundary } = useErrorBoundary();

  const colourCount = countBy(state.colourModel, (next) => next.enabled)['true'];

  const updater =
    <P extends keyof TileParametersModel, E extends Event | React.ChangeEvent, T = unknown>(
      param: P,
      prop = 'value',
      transform = (value: T) => value as TileParametersModel[P]
    ) =>
    (e: E) => {
      if (hasProperty(e.target, prop)) {
        const value = transform(e.target[prop] as T);
        dispatch({ type: 'set', param, value } as SetAction);
      }
    };

  const undo = undoManager.undo.bind(undoManager);
  const redo = undoManager.redo.bind(undoManager);

  const openSettingsPopover = useCallback(
    (e: React.MouseEvent) => {
      const anchor = e.currentTarget?.querySelector<HTMLElement>('.MuiSvgIcon-root') ?? e.currentTarget;
      setPopoverAnchor(anchor);
    },
    [setPopoverAnchor]
  );

  const closeSettingsPopover = useCallback(() => setPopoverAnchor(null), [setPopoverAnchor]);

  const loadState = useCallback(
    (state: TileParametersModel) => {
      dispatch({ type: 'load', state });
    },
    [dispatch]
  );

  const uploadFile = useCallback(
    (file: File | null) => {
      if (file) {
        file
          .text()
          .then((content) => {
            const state = tileParametersSchema.parse(JSON.parse(content));
            loadState(state);
          })
          .catch(showBoundary);
      }
    },
    [loadState, showBoundary]
  );

  const onDragging = (dragging: boolean): void => {
    if (ref.current && dragging) {
      ref.current.classList.add('sheer');
    } else if (ref.current) {
      ref.current.classList.remove('sheer');
    }
  };

  // Don't let a click on the popover's backdrop dismiss the popover if that click is on the settings button
  const onClickSettingsButton = (e: React.MouseEvent) => {
    const el = document.getElementById('settings-button');
    const clientRect = el?.getBoundingClientRect();
    if (
      clientRect &&
      clientRect.left <= e.clientX &&
      clientRect.right >= e.clientX &&
      clientRect.top <= e.clientY &&
      clientRect.bottom >= e.clientY
    ) {
      e.stopPropagation();
    }
  };

  return (
    <>
      <Paper
        elevation={2}
        id="settings-button"
        className="settings"
        onMouseEnter={openSettingsPopover}
        onClick={openSettingsPopover}
      >
        <TuneOutlinedIcon className="settings-icon" />
      </Paper>
      <Popover
        ref={ref}
        id="settings-popover"
        open={!!popoverAnchor}
        onClose={closeSettingsPopover}
        anchorEl={popoverAnchor}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          backdrop: {
            onClickCapture: onClickSettingsButton,
          },
        }}
      >
        <Paper className="controls" elevation={2}>
          <Grid container spacing={4} columns={4}>
            <Grid size={0.5}>
              <TextField
                label="Rows"
                id="rowCount"
                type="number"
                tooltip="The number of rows of tiles in the backsplash, in any orientation or offset pattern."
                inputProps={{ min: 1, max: 48 }}
                fullWidth
                variant="standard"
                value={state.rowCount}
                onChange={updater('rowCount', 'value', Number)}
              />
            </Grid>
            <Grid size={0.5}>
              <TextField
                label="Columns"
                type="number"
                inputProps={{ min: 1, max: 80 }}
                fullWidth
                tooltip="The number of columns of tiles in the backsplash, in any orientation or offset pattern."
                variant="standard"
                value={state.columnCount}
                onChange={updater('columnCount', 'value', Number)}
              />
            </Grid>
            <Grid size={1}>
              <FormSwitch
                id="orientation"
                label="Vertical"
                tooltip="Whether the layout is row-based (horizontal orientation) or column-based (vertical). Determines which way tile offsets step."
                checked={state.orientation === 'vertical'}
                disabled={state.offset < 2}
                onChange={updater('orientation', 'checked', (checked) => (checked ? 'vertical' : 'horizontal'))}
              />
            </Grid>
            <Grid size={2}>
              <TextField
                label="Seed"
                id="seed"
                fullWidth
                tooltip="Text on the basis of which a seed is computed for repeatable generation of a sequence of pseudorandom numbers."
                variant="standard"
                value={state.seed}
                onChange={updater('seed')}
              />
            </Grid>
            <Grid size={1}>
              <FormSlider
                id="aspectRatio"
                label="Aspect Ratio"
                tooltip="Slide to the right for thin wide tiles and to the left for thin tall tiles, in any orientation."
                min={-8 /* Offset the negatives by 2 because we don't use -1 and 0 values in the model */}
                max={10}
                step={1}
                onDragging={onDragging}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => (value <= 0 ? `1:${-(value - 2)}` : `${value}:1`)}
                value={state.aspectRatio < 0 ? state.aspectRatio + 2 : state.aspectRatio}
                onChange={updater('aspectRatio', 'value', (value: number) => (value <= 0 ? value - 2 : value))}
              />
            </Grid>
            <Grid size={1}>
              <FormSlider
                id="offset"
                label="Offset"
                min={1}
                max={10}
                step={1}
                tooltip={
                  state.orientation === 'horizontal'
                    ? 'Slide to offset the tiles in one row closer to the end of the tiles in the row below.'
                    : 'Slide to offset the tiles in one column closer to the top or bottom of the tiles in the previous column.'
                }
                onDragging={onDragging}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => (value === 1 ? 'None' : `1 in ${value}`)}
                value={state.offset}
                onChange={updater('offset')}
              />
            </Grid>
            <Grid size={1}>
              <Stack direction="column" spacing={1}>
                <FormSwitch
                  id="stepLeft"
                  tooltip={
                    state.orientation === 'horizontal'
                      ? 'For patterns with an offset on more than the half-tile, whether to step the offset to the left instead of to the right.'
                      : 'For patterns with an offset on more than the half-tile, whether to step the offset up instead of down.'
                  }
                  label={state.orientation === 'vertical' ? 'Step Up' : 'Step Left'}
                  disabled={state.offset <= 2}
                  checked={state.stepDirection === 'left'}
                  onChange={updater('stepDirection', 'checked', (checked) => (checked ? 'left' : 'right'))}
                />
                <FormSwitch
                  id="stepAlternate"
                  label="Alternate"
                  tooltip="For patterns with an offset on more than the half-tile, whether to alternate the offset back and forth or to continue stepping it indefinitely in the same direction."
                  disabled={state.offset <= 2}
                  checked={state.stepAlternate}
                  onChange={updater('stepAlternate', 'checked')}
                />
              </Stack>
            </Grid>
            <Grid size={1}>
              <Stack direction="row" spacing={1}>
                <IconButton
                  aria-label="undo"
                  color="primary"
                  tooltip="Undo the previous change"
                  onClick={undo}
                  disabled={!undoManager.canUndo}
                >
                  <UndoIcon />
                </IconButton>
                <IconButton
                  aria-label="redo"
                  color="primary"
                  tooltip="Redo the previous change"
                  onClick={redo}
                  disabled={!undoManager.canRedo}
                >
                  <RedoIcon />
                </IconButton>
              </Stack>
            </Grid>
            <Grid size={1}>
              <FormSlider
                label="Group Size"
                id="groupSize"
                tooltip={
                  state.orientation === 'horizontal'
                    ? 'The number of tiles in the basic row pattern that repeat as a group across the row.'
                    : 'The number of tiles in the basic column pattern that repeat as a group up and down the column.'
                }
                min={1}
                max={colourCount}
                step={1}
                onDragging={onDragging}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} of ${colourCount} colours`}
                value={state.groupSize}
                onChange={updater('groupSize')}
              />
            </Grid>
            <Grid size={1}>
              <FormSlider
                label="Complexity"
                id="complexity"
                tooltip={
                  state.orientation === 'horizontal'
                    ? 'A number of random tiles (may be zero) to add to every repeated group along the rows.'
                    : 'A number of random tiles (may be zero) to add to every repeated group up and down the columns.'
                }
                min={0}
                max={colourCount - 1}
                step={1}
                onDragging={onDragging}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} of ${colourCount - 1}`}
                value={state.complexity}
                onChange={updater('complexity')}
              />
            </Grid>
            <Grid size={1}>
              <FormSlider
                label="Rotation"
                id="rotation"
                tooltip="The number of columns in the tile layout by which to shift the pattern from left to right."
                min={0}
                max={state.columnCount - 1}
                step={1}
                onDragging={onDragging}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `Rotated ${value} places out of ${state.columnCount - 1}`}
                value={state.rotation}
                onChange={updater('rotation')}
              />
            </Grid>
            <Grid size={1}>
              <Button
                variant="outlined"
                id="colours"
                tooltip="Configure the colours of the tiles and the grout."
                startIcon={<PaletteOutlinedIcon />}
                onClick={() => dialog.current?.open()}
              >
                Palette
              </Button>
            </Grid>
            <Grid size={2}>
              <ConfigurationManager state={state} onLoadState={loadState} />
            </Grid>
            <Grid size={1} />
            <Grid size={1}>
              <FileButton onChange={uploadFile} accept="application/json">
                {(props) => (
                  <Button
                    {...props}
                    tooltip="Read in a backsplash layout from a file exported by another browser."
                    variant="outlined"
                    id="upload"
                    startIcon={<UploadOutlinedIcon />}
                  >
                    Upload
                  </Button>
                )}
              </FileButton>
            </Grid>
          </Grid>
        </Paper>
      </Popover>
      <ColourDialog api={dialog} onClose={closeSettingsPopover} />
    </>
  );
}

type FormSliderProps = {
  id: string;
  label: string;
  onDragging?: (dragging: boolean) => void;
} & SliderProps;

function FormSlider_({ id, label, onDragging, ...props }: FormSliderProps) {
  const ref = useRef<HTMLElement | null>(null);
  useMutationObserver(
    ref,
    'className',
    (classList) => {
      onDragging?.(!!classList && classList.search(/\bMuiSlider-dragging\b/) >= 0);
    },
    [onDragging]
  );

  return (
    <FormControl margin="none" variant="outlined" fullWidth>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Slider ref={ref} id={id} {...props} />
    </FormControl>
  );
}
const FormSlider = withTooltip(FormSlider_);

type FormSwitchProps = {
  id: string;
  label: string;
} & SwitchProps;

function FormSwitch_({ id, label, ...props }: FormSwitchProps) {
  return <FormControlLabel control={<Switch id={id} {...props} />} label={label} />;
}
const FormSwitch = withTooltip(FormSwitch_, true);
