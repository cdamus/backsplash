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

import { ColorInput as _ColorInput } from '@mantine/core';
import AddBoxOutlineIcon from '@mui/icons-material/AddBoxOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxOutlineIcon from '@mui/icons-material/CheckBoxOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import Divider from '@mui/material/Divider';
import _IconButton from '@mui/material/IconButton';
import _TextField from '@mui/material/TextField';
import { use, useRef, useState } from 'react';
import { TileModelContext } from '../model/backsplash-model';
import { ColourAction, colourPaletteReducer } from '../model/colour-model';
import { DialogApi, useDialogApi } from '../utils/dialog-utils';
import { Dialog } from './Dialog';
import { withTooltip } from './tooltip-support';

const ColorInput = withTooltip(_ColorInput);
const IconButton = withTooltip(_IconButton);
const TButton = withTooltip(_IconButton, false);
const TextField = withTooltip(_TextField);

export type ColourDialogProps = {
  api: React.Ref<DialogApi>;
  onClose?: (() => void) | null;
};

export default function ColourDialog({ api, onClose }: ColourDialogProps) {
  const { state, dispatch } = use(TileModelContext);

  const [addMode, setAddMode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [newColourCode, setNewColourCode] = useState('');
  const [newColourName, setNewColourName] = useState('');
  const [newColourHexCode, setNewColourHexCode] = useState('#000000');
  const newColourNameRef = useRef<HTMLInputElement | null>(null);

  const dialogApi = useDialogApi(api, null);

  const colourModel = state.colourModel;
  const dispatchColour = (action: ColourAction) =>
    dispatch({
      type: 'set-colour-palette',
      palette: colourPaletteReducer({ grout: state.grout, colourModel: state.colourModel }, action),
    });

  function submitNewColour() {
    const name = newColourName.replace(/\s/g, '');
    const code = newColourCode.replace(/\s/g, '');
    if (name && code && !codeError) {
      const colour = {
        name,
        hexcode: newColourHexCode,
        code,
        enabled: true,
        weight: 5,
        favourite: false,
      } as const;
      dispatchColour({ type: 'add-colour', colour });
      setAddMode(false);
    }
  }

  function dispatcher<A extends ColourAction>(action: A['type'], index: number, args: Partial<Omit<A, 'type'>> = {}) {
    const colourName = colourModel[index].name;
    return () => dispatchColour({ type: action, colourName, ...args } as A);
  }

  function dynamicDispatcher<A extends ColourAction, E>(
    action: A['type'],
    index: number,
    argsFunc: (e: E) => Partial<Omit<A, 'type'>>
  ) {
    const colourName = colourModel[index].name;
    return (e: E) => dispatchColour({ type: action, colourName, ...argsFunc(e) } as A);
  }

  function handleNewColourName(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.currentTarget.value;
    const code = newColourCode.trim();
    const name = value.trim();
    if (!code && name) {
      const initialCode = name[0].toUpperCase();
      setNewColourCode(initialCode);
      validateCode(initialCode);
    }
    setNewColourName(value);
  }

  function handleReturnKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault();
      submitNewColour();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAddMode(false);
    }
  }

  function handleNewColourCode(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.currentTarget.value;
    setNewColourCode(value);
    validateCode(value);
  }

  function validateCode(value: string) {
    const code = value.trim();
    if (code && colourModel.some((colour) => colour.code === code)) {
      setCodeError('Exists');
    } else {
      setCodeError('');
    }
  }

  function selectAll(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.select();
  }

  function handleClose() {
    setAddMode(false);
    onClose?.();
  }

  function engageAddMode() {
    setAddMode(true);
    setTimeout(() => {
      if (newColourNameRef.current) {
        newColourNameRef.current.focus();
      }
    }, 50);
  }

  return (
    <Dialog id="colour-dialog" className="colour-dialog" api={dialogApi} title="Colour Palette" onClose={handleClose}>
      <div className="colour-list">
        <div className="colour-row">
          <span className="colour-name">Grout</span>
          <ColorInput
            className="swatch"
            size="xs"
            format="hex"
            tooltip="The grout colour: type a hex code, select a colour from the colour space, or use the eyedropper tool to pick a colour from some window in your computer."
            popoverProps={{ withinPortal: false }}
            value={state.grout}
            onChangeEnd={(colour) => dispatchColour({ type: 'set-grout', colour })}
          />
        </div>
      </div>
      <Divider />
      <div className="colour-list">
        {colourModel.map((colour, i) => (
          <div key={colour.name} className={`colour-row ${colour.enabled ? '' : 'disabled'}`}>
            <span className="colour-name" style={{ fontSize: `${14 + (colour.weight - 5)}pt` }}>
              {colour.name}
            </span>
            <ColorInput
              className="swatch"
              disabled={!colour.enabled}
              tooltip="A tile colour: type a hex code, select a colour from the colour space, or use the eyedropper tool to pick a colour from some window in your computer."
              size="xs"
              format="hex"
              popoverProps={{ withinPortal: false }}
              value={colour.hexcode}
              onChangeEnd={dynamicDispatcher('change-colour', i, (e) => ({
                hexcode: e,
              }))}
            />
            <IconButton
              size="small"
              onClick={dispatcher('toggle-colour', i)}
              tooltip="Check this to include tiles of this colour in the backsplash design."
            >
              {colour.enabled ? <CheckBoxOutlineIcon /> : <CheckBoxOutlineBlankIcon />}
            </IconButton>
            <IconButton
              size="small"
              onClick={dispatcher('toggle-fave', i)}
              tooltip="Check this to ensure that tiles of this colour occur in every otherwise randomly generated group of tiles."
            >
              {colour.favourite ? <StarIcon htmlColor="gold" /> : <StarOutlineIcon />}
            </IconButton>
            <IconButton
              size="small"
              tooltip="Click to make tiles of this colour occur less frequently in the backsplash design."
              onClick={dispatcher('weight-colour', i, { delta: -1 })}
              disabled={colour.weight <= 1}
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
            <IconButton
              size="small"
              tooltip="Click to make tiles of this colour occur more frequently in the backsplash design."
              onClick={dispatcher('weight-colour', i, { delta: +1 })}
              disabled={colour.weight >= 9}
            >
              <AddCircleOutlineIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={dispatcher('delete-colour', i)}
              tooltip="Click to delete this tile colour configuration entirely. Usually better just to uncheck it."
            >
              <DeleteOutlineIcon />
            </IconButton>
          </div>
        ))}
        <div className="colour-row">
          {addMode ? (
            <>
              <form className="new-colour" onSubmit={() => submitNewColour()}>
                <TextField
                  label="Code"
                  name="code"
                  error={!!codeError}
                  tooltip="An unique single-letter code to represent tiles of this colour in the backsplash pattern map sent to your contractor."
                  helperText={codeError}
                  inputRef={(input: HTMLInputElement) => void (input && (input.tabIndex = colourModel.length + 3))}
                  className="colour-code"
                  tabIndex={-1}
                  size="small"
                  variant="standard"
                  onKeyDown={handleReturnKey}
                  onFocus={selectAll}
                  value={newColourCode}
                  onChange={handleNewColourCode}
                />
                <TextField
                  label="Name"
                  name="name"
                  tooltip="The name by which your contractor will identify the tiles of this colour."
                  inputRef={(input: HTMLInputElement) => {
                    if (input) {
                      newColourNameRef.current = input;
                      input.tabIndex = colourModel.length + 2;
                    }
                  }}
                  className="colour-name"
                  tabIndex={-1}
                  size="small"
                  variant="standard"
                  onKeyDown={handleReturnKey}
                  onFocus={selectAll}
                  value={newColourName}
                  onChange={handleNewColourName}
                />
              </form>
              <ColorInput
                className="swatch"
                size="xs"
                format="hex"
                tooltip="A new unique tile colour: type a hex code, select a colour from the colour space, or use the eyedropper tool to pick a colour from some window in your computer."
                popoverProps={{ withinPortal: false }}
                value={newColourHexCode}
                onChange={setNewColourHexCode}
                defaultValue="#000000"
              />
              <IconButton
                size="small"
                onClick={() => setAddMode(false)}
                tooltip="Discard this new tile colour configuration."
              >
                <CancelIcon />
              </IconButton>
            </>
          ) : (
            <TButton className="add-colour" size="small" onClick={engageAddMode} tooltip="Configure a new tile colour.">
              <AddBoxOutlineIcon />
            </TButton>
          )}
        </div>
      </div>
    </Dialog>
  );
}
