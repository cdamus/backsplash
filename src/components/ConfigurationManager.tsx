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

import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import DialogContentText from '@mui/material/DialogContentText';
import Divider from '@mui/material/Divider';
import _IconButton from '@mui/material/IconButton';
import Input from '@mui/material/Input';
import MenuItem, { MenuItemProps } from '@mui/material/MenuItem';
import _Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { isEqual } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { TileParametersModel, tileParametersSchema } from '../model/backsplash-model';
import { useConfirmDialogApi } from '../utils/dialog-utils';
import { ConfirmDialog } from './Dialog';
import { withTooltip } from './tooltip-support';

const Select = withTooltip(_Select);
const IconButton = withTooltip(_IconButton);

const SAVED_CONFIGURATIONS_KEY = 'ca.damus.backsplash:saved_configurations';

const configurationStoreSchema = z.array(
  z
    .object({
      id: z.string().uuid().default(uuid),
      name: z.string().nonempty().trim(),
      state: tileParametersSchema,
    })
    .readonly()
);
type ConfigurationStore = z.infer<typeof configurationStoreSchema>;

function loadConfigurations(): ConfigurationStore {
  const configs = JSON.parse(window.localStorage.getItem(SAVED_CONFIGURATIONS_KEY) ?? '[]') as unknown;
  const configurationStore = configurationStoreSchema.parse(configs);
  return configurationStore;
}

function storeConfigurations(configs: ConfigurationStore) {
  window.localStorage.setItem(SAVED_CONFIGURATIONS_KEY, JSON.stringify(configs));
}

function saveConfiguration(name: string, state: TileParametersModel) {
  const result = loadConfigurations();
  result.push({ id: uuid(), name, state });
  storeConfigurations(result);
  return result;
}

function deleteConfiguration(index: number) {
  const result = loadConfigurations();
  result.splice(index, 1);
  storeConfigurations(result);
  return result;
}

export type ConfigurationManagerProps = {
  state: TileParametersModel;
  onLoadState: (state: TileParametersModel) => void;
};

export default function ConfigurationManager({ state, onLoadState }: ConfigurationManagerProps) {
  const [currentConfig, setCurrentConfig] = useState(-1);
  const [configs, setConfigs] = useState(loadConfigurations());
  const [newConfigState, setNewConfigState] = useState({
    name: '',
    canSave: false,
  });
  const newConfigNameRef = useRef<HTMLInputElement | null>(null);
  const saveNew = currentConfig === configs.length;
  const isConfig = currentConfig >= 0 && currentConfig < configs.length;

  useEffect(() => {
    if (saveNew && newConfigNameRef.current) {
      newConfigNameRef.current.focus();
    }
  }, [saveNew]);

  const loadConfig = (index: number) => {
    const config = configs[index];
    if (config && !isEqual(config.state, state)) {
      onLoadState(config.state);
    }
  };

  const handleConfigSelection = (_: unknown, option: React.ReactNode) => {
    const menuItem = option as React.ReactElement<MenuItemProps>;
    const index = Number(menuItem.props.value);
    setCurrentConfig(index);
    if (index >= 0 && index < configs.length) {
      loadConfig(index);
    }
  };

  const saveConfig = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    if (newConfigState.canSave) {
      setConfigs(saveConfiguration(newConfigState.name, state));
    }
  };

  const updateNewConfigState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.currentTarget.value.trim();
    setNewConfigState({ name, canSave: !!name });
  };

  const handleEsc = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelNewConfig();
    }
  };

  const cancelNewConfig = () => {
    setCurrentConfig(-1);
  };

  const deleteConfig = () => {
    setConfigs(deleteConfiguration(currentConfig));
    if (currentConfig === configs.length - 1) {
      // Backtrack because we deleted the last config
      setCurrentConfig(configs.length - 2);
    }
  };
  const confirmDialogApi = useConfirmDialogApi();

  return (
    <>
      {saveNew ? (
        <form id="save-config" onSubmit={saveConfig}>
          <Stack
            className="configuration-manager"
            direction="row"
            spacing={0}
            alignItems="center"
            onKeyDown={handleEsc}
          >
            <Input
              id="config-name"
              name="configName"
              inputRef={newConfigNameRef}
              placeholder="Enter a name"
              onChange={updateNewConfigState}
              fullWidth
            />
            <IconButton
              aria-label="save configuration"
              color="primary"
              disabled={!newConfigState.canSave}
              tooltip="Save the new configuration to your browser's memory."
              onClick={saveConfig}
            >
              <SaveAltIcon />
            </IconButton>
            <IconButton
              aria-label="cancel configuration"
              color="primary"
              onClick={cancelNewConfig}
              tooltip="Discard this new configuration."
            >
              <CancelIcon />
            </IconButton>
          </Stack>
        </form>
      ) : (
        <Stack className="configuration-manager" direction="row" spacing={0} alignItems="center">
          <Select
            id="configs"
            color="primary"
            variant="standard"
            name="configuration"
            tooltip="Store and recall backsplash layouts in your browser's memory."
            fullWidth
            value={currentConfig}
            onChange={handleConfigSelection}
          >
            <MenuItem value={-1} disabled>
              Tile configurations
            </MenuItem>
            {configs.map((config, i) => (
              <MenuItem key={config.id} value={i}>
                {config.name}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem value={configs.length}>
              <AddIcon /> New Configuration...
            </MenuItem>
          </Select>
          <IconButton
            aria-label="delete configuration"
            color="primary"
            disabled={!isConfig}
            tooltip="Delete the selected configuration from your browser's memory."
            onClick={() => confirmDialogApi.current?.open()}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      )}

      <ConfirmDialog api={confirmDialogApi} title="Delete Configuration?" onConfirm={deleteConfig}>
        <DialogContentText>
          Are you sure you want to delete the configuration named "{configs[currentConfig]?.name}"?
        </DialogContentText>
      </ConfirmDialog>
    </>
  );
}
