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

import Button from '@mui/material/Button';
import MuiDialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useImperativeHandle, useState } from 'react';
import { DialogApi, DialogButtons, InternalDialogApi, useDialogApi } from '../utils/dialog-utils';

const defaultButtons = { Close: null } as const;

export type DialogProps = React.PropsWithChildren<{
  api: React.Ref<DialogApi>;
  id?: string;
  className?: string;
  title?: string;
  onClose?: () => void;
}>;

export function Dialog({ api, id, className, title, onClose, children }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [buttons, setButtons] = useState<DialogButtons>(defaultButtons);

  useImperativeHandle<DialogApi, InternalDialogApi>(
    api,
    () => ({
      open(buttons) {
        setButtons(buttons ?? defaultButtons);
        setOpen(true);
      },
      get isOpen() {
        return open;
      },
    }),
    [open, setOpen],
  );

  const handleButton = (action: DialogButtons[string]) => () => {
    action?.();
    setOpen(false);
    onClose?.();
  };

  return open ? (
    <MuiDialog
      id={id}
      className={className}
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="dialog-title">{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        {Object.entries(buttons).map(([label, action]) => (
          <Button key={label} onClick={handleButton(action)}>
            {label}
          </Button>
        ))}
      </DialogActions>
    </MuiDialog>
  ) : null;
}

export type ConfirmDialogProps = React.PropsWithChildren<{
  api: React.Ref<DialogApi>;
  title?: string;
  onConfirm?: () => void;
}>;

export function ConfirmDialog({ api, title, onConfirm, children }: ConfirmDialogProps) {
  const dialogApi = useDialogApi(api, { Yes: onConfirm, No: null });
  return (
    <Dialog className="confirm-dialog" api={dialogApi} title={title}>
      {children}
    </Dialog>
  );
}
