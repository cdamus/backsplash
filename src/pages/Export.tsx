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

import ChevronLeft from '@mui/icons-material/ChevronLeft';
import DownloadOutlineIcon from '@mui/icons-material/FileDownloadOutlined';
import ConstructionIcon from '@mui/icons-material/ConstructionOutlined';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import HomeOutlineIcon from '@mui/icons-material/HomeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem, { MenuItemProps } from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { saveAs } from 'file-saver';
import { sortBy } from 'lodash';
import { use, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import TileCanvas, { TileCanvasProps } from '../components/TileCanvas';
import TopBar from '../components/TopBar';
import { isInHole, TileModelContext, TileParametersModel } from '../model/backsplash-model';
import { generateRows, TileRow } from '../model/tile-generator';
import { withTooltip } from '../components/tooltip-support';

const TButton = withTooltip(Button);
const TListItem = withTooltip(ListItem);

export default function Export() {
  const { state } = use(TileModelContext);
  const rows = useMemo<TileRow[]>(() => {
    const result = generateRows(state);
    return result;
  }, [state]);
  const [contractorView, setContractorView] = useState(false);

  const colourCodes: Record<string, string> = {};
  state.colourModel.forEach((colour) => (colourCodes[colour.name] = colour.code));

  const toggleContractorView = () => setContractorView(!contractorView);

  return (
    <>
      <TopBar
        left={HomeButton}
        right={
          <ActionsMenu model={state} contractorView={contractorView} toggleContractorView={toggleContractorView} />
        }
      />
      <Render model={state} rows={rows} colourCodes={colourCodes} contractorView={contractorView} />
    </>
  );
}

type _RenderProps = {
  model: TileParametersModel;
  rows: ReadonlyArray<TileRow>;
  colourCodes: Record<string, string>;
  contractorView?: boolean;
};

type RenderProps<K extends keyof _RenderProps = keyof _RenderProps> = Pick<_RenderProps, K>;

function HomeButton() {
  return (
    <Button
      id="home"
      color="inherit"
      startIcon={<HomeOutlineIcon />}
      tooltip="Return to the backsplash designer."
      component={withTooltip(Link)}
      to="/"
    >
      Home
    </Button>
  );
}

type ActionMenuItemProps<K extends keyof _RenderProps> = Pick<MenuItemProps, 'onClick'> & RenderProps<K>;

type ContractorViewItemProps = ActionMenuItemProps<'contractorView'> & {
  toggleContractorView: () => void;
};

function ContractorViewItem({ contractorView, toggleContractorView, onClick }: ContractorViewItemProps) {
  const toggle = (e: React.MouseEvent<HTMLLIElement>) => {
    onClick?.(e);
    toggleContractorView();
  };

  return (
    <MenuItem
      id="contractor-view"
      tooltip={
        contractorView
          ? 'Switch to the design summary view.'
          : 'Switch to a summary view suitable for printing and sending to your contractor.'
      }
      tipPlacement="left"
      onClick={toggle}
      component={TListItem}
    >
      <ListItemIcon>{contractorView ? <DesignServicesIcon /> : <ConstructionIcon />}</ListItemIcon>
      <ListItemText>{contractorView ? 'Design View' : 'Contractor View'}</ListItemText>
    </MenuItem>
  );
}

function DownloadItem({ model, onClick }: ActionMenuItemProps<'model'>) {
  const download = (e: React.MouseEvent<HTMLLIElement>) => {
    onClick?.(e);
    const text = JSON.stringify(model, undefined, 2);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'backsplash.json');
  };

  return (
    <MenuItem
      id="download"
      tooltip="Download the design parameters in a JSON file to share with other users."
      tipPlacement="left"
      onClick={download}
      component={TListItem}
    >
      <ListItemIcon>
        <DownloadOutlineIcon />
      </ListItemIcon>
      <ListItemText>Download</ListItemText>
    </MenuItem>
  );
}

type ActionsMenuProps = ContractorViewItemProps & RenderProps<'model' | 'contractorView'>;

function ActionsMenu({ model, contractorView, toggleContractorView }: ActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const openMenu = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <TButton id="actions-menu" color="inherit" tooltip="Menu of export actions." onClick={openMenu}>
        <MenuIcon />
      </TButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        slotProps={{ list: { 'aria-labelledby': 'actions-menu' } }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <DownloadItem onClick={handleClose} model={model} />
        <ContractorViewItem
          onClick={handleClose}
          contractorView={contractorView}
          toggleContractorView={toggleContractorView}
        />
      </Menu>
    </div>
  );
}

function Render({ contractorView, ...props }: RenderProps) {
  return contractorView ? <ContractorView {...props} /> : <DesignView {...props} />;
}

function DesignView({ model, rows, colourCodes }: RenderProps) {
  const [thumbnailWidth, setThumbnailWidth] = useState<number | undefined>();
  const [thumbnailHeight, setThumbnailHeight] = useState<number | undefined>();

  useEffect(() => {
    const thumbnail = document.querySelector<HTMLCanvasElement>('#pattern-thumbnail');
    const referenceAccordion = document.querySelector<HTMLElement>(
      '#export-parameters-accordion .MuiAccordionSummary-root'
    );
    if (referenceAccordion && thumbnail) {
      let width = referenceAccordion.getBoundingClientRect().width;
      const computedStyle = window.getComputedStyle(referenceAccordion);
      width -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
      if (width !== thumbnailWidth) {
        setThumbnailWidth(width);
      }
      const height = window.innerHeight / 2;
      if (height !== thumbnailHeight) {
        setThumbnailHeight(height);
      }
    }
  }, [thumbnailWidth, thumbnailHeight]);

  return (
    <div className="export">
      <Paper className="backsplash-map" elevation={2}>
        <BacksplashMap model={model} rows={rows} colourCodes={colourCodes} />
      </Paper>
      <div className="accordions">
        <Accordion id="export-parameters-accordion">
          <AccordionSummary
            className="custom"
            aria-controls="export-parameters"
            id="export-parameters-summary"
            expandIcon={<ChevronLeft />}
          >
            <Typography component="span">Tile Pattern Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div className="export-parameters">
              <Legend model={model} />
              <TileCounts rows={rows} model={model} />
              <Parameters model={model} />
              {model.holes.length > 0 ? <HoleMap model={model} /> : null}
            </div>
          </AccordionDetails>
        </Accordion>
        <Accordion id="pattern-thumbnail-accordion" defaultExpanded>
          <AccordionSummary
            className="custom"
            aria-controls="pattern-thumbnail"
            id="export-pattern-thumbnail"
            expandIcon={<ChevronLeft />}
          >
            <Typography component="span">Tile Pattern Thumbnail</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TileCanvas
              id="pattern-thumbnail"
              model={model}
              rows={rows}
              width={thumbnailWidth}
              height={thumbnailHeight}
            />
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}

function ContractorView({ model, rows, colourCodes }: RenderProps) {
  return (
    <div className="export">
      <BacksplashMap model={model} rows={rows} colourCodes={colourCodes} />
      <div className="export-parameters contractor-view">
        <Legend model={model} contractorView />
        <TileCounts rows={rows} model={model} contractorView />
        <TileCanvas
          id="pattern-thumbnail"
          model={model}
          rows={rows}
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.5}
        />
      </div>
    </div>
  );
}

function BacksplashMap({ model, rows, colourCodes }: RenderProps) {
  let basisProps = {} as Partial<Pick<TileCanvasProps, 'basisFactor'>>;
  if (model.aspectRatio > 1) {
    basisProps = { basisFactor: 1.6667 / model.aspectRatio };
  } else if (model.aspectRatio < -1) {
    basisProps = { basisFactor: -1.6667 / model.aspectRatio };
  }

  return (
    <TileCanvas
      className="backsplash-map"
      model={model}
      rows={rows}
      {...basisProps}
      tileText={(tile) => colourCodes[tile.colour]}
    />
  );
}

function Legend({ model, contractorView }: RenderProps<'model' | 'contractorView'>) {
  return (
    <div className={exportSectionClass(contractorView)}>
      <Typography variant="h4">Legend</Typography>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Colour</th>
            {contractorView ? null : (
              <>
                <th>Weight</th>
                <th>Favourite</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {model.colourModel
            .filter((colour) => colour.enabled)
            .map((colour) => (
              <tr key={colour.name}>
                <td className="export-colour-code">{colour.code}</td>
                <td>{colour.name}</td>
                {contractorView ? null : (
                  <>
                    <td>{colour.weight}</td>
                    <td>{colour.favourite ? '✔︎' : ''}</td>
                  </>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function TileCounts({ model, rows, contractorView }: RenderProps<'rows' | 'model' | 'contractorView'>) {
  const tileCounts: Record<string, number> = {};
  rows.forEach((row) =>
    row.columns
      .filter((col) => !isInHole(col.row, col.key, model))
      .forEach((col) => (tileCounts[col.colour] = (tileCounts[col.colour] ?? 0) + 1))
  );

  return (
    <div className={exportSectionClass(contractorView)}>
      <Typography variant="h4">Tiles Needed</Typography>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {sortBy(Object.keys(tileCounts)).map((colour) => (
            <tr key={colour}>
              <td>{colour}</td>
              <td>{tileCounts[colour]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Parameters({ model }: RenderProps<'model'>) {
  return (
    <div className={exportSectionClass()}>
      <Typography variant="h4">Parameters</Typography>
      <div className="export-column">
        <table>
          <thead>
            <tr>
              <th>Seed</th>
              <th>Rows</th>
              <th>Columns</th>
              <th>Group Size</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{model.seed}</td>
              <td>{model.rowCount}</td>
              <td>{model.columnCount}</td>
              <td>{model.groupSize}</td>
            </tr>
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th>Complexity</th>
              <th>Offset</th>
              <th>Step Direction</th>
              <th>Alternating?</th>
              <th>Rotation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{model.complexity}</td>
              <td>{model.offset === 1 ? 'None' : `1/${model.offset}`}</td>
              <td>{model.stepDirection === 'left' ? 'Left' : 'Right'}</td>
              <td>{model.offset > 2 ? (model.stepAlternate ? '✔︎' : '✘') : 'N/A'}</td>
              <td>{model.rotation}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoleMap({ model }: RenderProps<'model'>) {
  return (
    <div className={exportSectionClass()}>
      <Typography variant="h4">Holes in the Pattern</Typography>
      <table>
        <thead>
          <tr>
            <th colSpan={2}>From Corner</th>
            <th colSpan={2}>To Corner</th>
          </tr>
          <tr>
            <th>Row</th>
            <th>Column</th>
            <th>Row</th>
            <th>Column</th>
          </tr>
        </thead>
        <tbody>
          {model.holes.map((hole) => (
            <tr key={`${hole.startRow},${hole.startColumn}:${hole.endRow},${hole.endColumn}`}>
              <td>{hole.startRow}</td>
              <td>{hole.startColumn}</td>
              <td>{hole.endRow}</td>
              <td>{hole.endColumn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function exportSectionClass(contractorView = false) {
  return `export-section ${contractorView ? 'contractor-view' : ''}`;
}
