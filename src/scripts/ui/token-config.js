import {
  MODULE_NAME,
  initializeMovement,
  initializeSpriteSheet,
} from "../functions.js";
import {
  DIRECTIONAL_IMAGE_MODE,
  getIsometricPerspectiveMode,
  SPRITE_SHEET_MODE,
} from "../constants.js";
import {
  createActionButton,
  createCheckboxGroup,
  createFormGroup,
  createImagePickerField,
  createNumberGroup,
  createSelectGroup,
} from "./dom.js";
import { createSpriteSheetPreview } from "./sprite-preview.js";
import {
  cardinalizeSpriteSheetDirection,
  getSpriteSheetDirections,
} from "../sprite-sheet.js";
import {
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  browseSpriteSheet,
  clearAllSettings,
  clearTokenSettings,
  getDirectionalImages,
  getHtmlElement,
  getMovementMode,
  getSpriteSheetConfig,
  getTokenDiagonalMode,
  hasMovementFlags,
  localize,
  savePrototypeSettings,
  setSheetPosition,
} from "./shared.js";

function createMovementFieldset(appearanceTab) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "movement-fieldset";

  const legend = document.createElement("legend");
  legend.className = "movement-legend";
  legend.textContent = "8bit Movement";
  fieldset.append(legend);
  appearanceTab.append(fieldset);
  return fieldset;
}

function addActivationControls(fieldset, token, refreshControls) {
  const fields = createFormGroup(
    fieldset,
    localize("8BITMOVEMENT.activate_label"),
  );
  fields.classList.add("movement-activation-actions");

  fields.append(
    createActionButton({
      className: "activate-separate",
      title: localize("8BITMOVEMENT.activate"),
      iconClass: "far fa-plus-square",
      text: localize("8BITMOVEMENT.Mode-Separate"),
      onClick: async () => {
        await initializeMovement(token.id, { render: false });
        refreshControls();
      },
    }),
    createActionButton({
      className: "activate-sprite-sheet",
      title: localize("8BITMOVEMENT.Sprite-Sheet-Activate"),
      iconClass: "fas fa-table-cells-large",
      text: localize("8BITMOVEMENT.Mode-Sheet"),
      onClick: async () => {
        await browseSpriteSheet(token, refreshControls);
      },
    }),
  );
}

function addDirectionPicker(
  fieldset,
  token,
  images,
  uniquePrefix,
  direction,
) {
  createFormGroup(
    fieldset,
    localize(direction.labelKey),
    `${uniquePrefix}-${direction.action}-path`,
  ).append(
    createImagePickerField({
      id: `${uniquePrefix}-${direction.action}`,
      title: localize(direction.labelKey),
      src: images[direction.key],
      onSelect: async (path) => {
        await token.update(
          { [`flags.${MODULE_NAME}.${direction.imageFlag}`]: path },
          { render: false },
        );
      },
    }),
  );
}

function addDirectionalImageControls(
  fieldset,
  token,
  images,
  uniquePrefix,
  diagonalMode,
) {
  for (const direction of CARDINAL_DIRECTIONS) {
    addDirectionPicker(fieldset, token, images, uniquePrefix, direction);
  }

  if (!diagonalMode) return;
  for (const direction of DIAGONAL_DIRECTIONS) {
    addDirectionPicker(fieldset, token, images, uniquePrefix, direction);
  }
}

async function updateSpriteSheetValue(token, key, value) {
  const config = {
    ...getSpriteSheetConfig(token),
    [key]: value,
  };
  await token.update(
    { [`flags.${MODULE_NAME}.spriteSheet`]: config },
    { render: false },
  );
  return config;
}

function createDirectionRowTable(
  token,
  uniquePrefix,
  directions,
  preview,
) {
  const table = document.createElement("table");
  table.className = "movement-direction-row-table";

  const head = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const labelKey of [
    "8BITMOVEMENT.Sprite-Sheet-Direction",
    "8BITMOVEMENT.Sprite-Sheet-Source-Row",
  ]) {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.textContent = localize(labelKey);
    headingRow.append(heading);
  }
  head.append(headingRow);

  const body = document.createElement("tbody");
  for (const direction of directions) {
    const row = document.createElement("tr");
    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    labelCell.textContent = localize(direction.labelKey);

    const inputCell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.id = `${uniquePrefix}-sprite-sheet-row-${direction.key}`;
    input.value = String(
      getSpriteSheetConfig(token).directionRows[direction.key],
    );
    input.setAttribute(
      "aria-label",
      `${localize(direction.labelKey)} ${localize("8BITMOVEMENT.Sprite-Sheet-Source-Row")}`,
    );
    input.addEventListener("change", async (event) => {
      const directionRows = {
        ...getSpriteSheetConfig(token).directionRows,
        [direction.key]:
          Math.floor(Number(event.currentTarget.value)) || 0,
      };
      const config = await updateSpriteSheetValue(
        token,
        "directionRows",
        directionRows,
      );
      await preview.update(config);
    });
    inputCell.append(input);
    row.append(labelCell, inputCell);
    body.append(row);
  }

  table.append(head, body);
  return table;
}

function addSpriteSheetControls(
  fieldset,
  token,
  uniquePrefix,
  diagonalMode,
) {
  const spriteSheet = getSpriteSheetConfig(token);
  const directions = getSpriteSheetDirections(diagonalMode);
  let preview;

  createFormGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Image"),
    `${uniquePrefix}-sprite-sheet-path`,
  ).append(
    createImagePickerField({
      id: `${uniquePrefix}-sprite-sheet`,
      title: localize("8BITMOVEMENT.Sprite-Sheet-Image"),
      src: spriteSheet.src,
      pickerType: "image",
      onSelect: async (path) => {
        await initializeSpriteSheet(token.id, path, { render: false });
        await preview.update(getSpriteSheetConfig(token));
      },
    }),
  );

  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Frame-Width"),
    `${uniquePrefix}-sprite-sheet-frame-width`,
    spriteSheet.frameWidth,
    { min: 1, step: 1 },
    async (event) => {
      const config = await updateSpriteSheetValue(
        token,
        "frameWidth",
        Math.floor(Number(event.currentTarget.value)) || 0,
      );
      await preview.update(config);
    },
  );
  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Frame-Height"),
    `${uniquePrefix}-sprite-sheet-frame-height`,
    spriteSheet.frameHeight,
    { min: 1, step: 1 },
    async (event) => {
      const config = await updateSpriteSheetValue(
        token,
        "frameHeight",
        Math.floor(Number(event.currentTarget.value)) || 0,
      );
      await preview.update(config);
    },
  );
  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Source-Offset-X"),
    `${uniquePrefix}-sprite-sheet-source-offset-x`,
    spriteSheet.sourceOffsetX,
    { min: 0, step: 1 },
    async (event) => {
      const config = await updateSpriteSheetValue(
        token,
        "sourceOffsetX",
        Math.floor(Number(event.currentTarget.value)) || 0,
      );
      await preview.update(config);
    },
  );
  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Source-Offset-Y"),
    `${uniquePrefix}-sprite-sheet-source-offset-y`,
    spriteSheet.sourceOffsetY,
    { min: 0, step: 1 },
    async (event) => {
      const config = await updateSpriteSheetValue(
        token,
        "sourceOffsetY",
        Math.floor(Number(event.currentTarget.value)) || 0,
      );
      await preview.update(config);
    },
  );

  preview = createSpriteSheetPreview({
    diagonal: diagonalMode,
    isometric: getIsometricPerspectiveMode(),
  });
  createFormGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Direction-Rows"),
  ).append(
    createDirectionRowTable(token, uniquePrefix, directions, preview),
  );
  createFormGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Previews"),
  ).append(preview.element);
  void preview.update(spriteSheet);

  createSelectGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Facing"),
    `${uniquePrefix}-sprite-sheet-facing`,
    diagonalMode
      ? spriteSheet.facing
      : cardinalizeSpriteSheetDirection(spriteSheet.facing),
    Object.fromEntries(
      directions.map((direction) => [
        direction.key,
        localize(direction.labelKey),
      ]),
    ),
    async (event) => {
      await updateSpriteSheetValue(token, "facing", event.currentTarget.value);
    },
  );

  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Scale"),
    `${uniquePrefix}-sprite-sheet-scale`,
    spriteSheet.scale,
    { min: 0.1, max: 5, step: 0.05 },
    async (event) => {
      await updateSpriteSheetValue(
        token,
        "scale",
        Math.max(0.1, Number(event.currentTarget.value) || 1),
      );
    },
  );
  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Offset-X"),
    `${uniquePrefix}-sprite-sheet-offset-x`,
    spriteSheet.offsetX,
    { step: 1 },
    async (event) => {
      await updateSpriteSheetValue(
        token,
        "offsetX",
        Number(event.currentTarget.value) || 0,
      );
    },
  );
  createNumberGroup(
    fieldset,
    localize("8BITMOVEMENT.Sprite-Sheet-Offset-Y"),
    `${uniquePrefix}-sprite-sheet-offset-y`,
    spriteSheet.offsetY,
    { step: 1 },
    async (event) => {
      await updateSpriteSheetValue(
        token,
        "offsetY",
        Number(event.currentTarget.value) || 0,
      );
    },
  );
}

async function changeMovementMode(token, nextMode) {
  if (nextMode === SPRITE_SHEET_MODE) {
    const spriteSheet = getSpriteSheetConfig(token);
    await token.update(
      {
        [`flags.${MODULE_NAME}.mode`]: SPRITE_SHEET_MODE,
        [`flags.${MODULE_NAME}.spriteSheet`]: spriteSheet,
        [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
        lockRotation: true,
      },
      { render: false },
    );
  } else {
    await token.update(
      {
        [`flags.${MODULE_NAME}.mode`]: DIRECTIONAL_IMAGE_MODE,
        [`flags.${MODULE_NAME}.-=__nextTexture`]: null,
      },
      { render: false },
    );
  }
}

function addModeControl(
  fieldset,
  token,
  uniquePrefix,
  movementMode,
  refreshControls,
) {
  createSelectGroup(
    fieldset,
    localize("8BITMOVEMENT.Mode"),
    `${uniquePrefix}-movement-mode`,
    movementMode,
    {
      [DIRECTIONAL_IMAGE_MODE]: localize("8BITMOVEMENT.Mode-Separate"),
      [SPRITE_SHEET_MODE]: localize("8BITMOVEMENT.Mode-Sheet"),
    },
    async (event) => {
      await changeMovementMode(token, event.currentTarget.value);
      refreshControls();
    },
  );
}

function addPrototypeAction(
  fieldset,
  token,
  images,
  movementMode,
  refreshControls,
) {
  const actions = document.createElement("div");
  actions.className = "movement-actions";
  fieldset.append(actions);

  const resetImage =
    movementMode === SPRITE_SHEET_MODE ? token.texture.src : images.down;

  actions.append(
    createActionButton({
      className: "save-prototype",
      title: localize("8BITMOVEMENT.save"),
      iconClass: "fa-solid fa-floppy-disk",
      text: localize("8BITMOVEMENT.save"),
      buttonClass: "button movement-config-action",
      onClick: async () => {
        await savePrototypeSettings(token, images, { render: false });
      },
    }),
    createActionButton({
      className: "clear-token",
      title: localize("8BITMOVEMENT.clear-token"),
      iconClass: "fa-solid fa-eraser",
      text: localize("8BITMOVEMENT.clear-token"),
      buttonClass: "button movement-config-action",
      onClick: async () => {
        await clearTokenSettings(token, resetImage, { render: false });
        refreshControls();
      },
    }),
    createActionButton({
      className: "clear-all",
      title: localize("8BITMOVEMENT.delete"),
      iconClass: "fa-solid fa-trash",
      text: localize("8BITMOVEMENT.delete"),
      buttonClass: "button movement-config-action",
      onClick: async () => {
        await clearAllSettings(token, resetImage, { render: false });
        refreshControls();
      },
    }),
  );
}

function renderMovementControls(sheet, appearanceTab, token) {
  appearanceTab.querySelector(".movement-fieldset")?.remove();
  const fallbackImage = token.texture?.src ?? token.actor?.img ?? "";
  const images = getDirectionalImages(token, fallbackImage);
  const fieldset = createMovementFieldset(appearanceTab);
  const refreshControls = () =>
    renderMovementControls(sheet, appearanceTab, token);

  if (!hasMovementFlags(token)) {
    addActivationControls(fieldset, token, refreshControls);
    setSheetPosition(sheet);
    return;
  }

  const uniquePrefix = sheet.options?.uniqueId ?? token.uuid ?? token.id;
  createCheckboxGroup(
    fieldset,
    localize("8BITMOVEMENT.lock"),
    `${uniquePrefix}-locked`,
    !!token.getFlag(MODULE_NAME, "locked"),
    async (event) => {
      await token.update(
        { [`flags.${MODULE_NAME}.locked`]: event.currentTarget.checked },
        { render: false },
      );
      refreshControls();
    },
  );

  if (token.getFlag(MODULE_NAME, "locked")) {
    setSheetPosition(sheet);
    return;
  }

  const movementMode = getMovementMode(token);
  const diagonalMode = getTokenDiagonalMode(token);
  createCheckboxGroup(
    fieldset,
    localize("8BITMOVEMENT.Token-Diagonal-Mode"),
    `${uniquePrefix}-diagonal-mode`,
    diagonalMode,
    async (event) => {
      await token.update(
        {
          [`flags.${MODULE_NAME}.diagonalMode`]:
            event.currentTarget.checked,
        },
        { render: false },
      );
      refreshControls();
    },
  );
  addModeControl(
    fieldset,
    token,
    uniquePrefix,
    movementMode,
    refreshControls,
  );
  if (movementMode === SPRITE_SHEET_MODE) {
    addSpriteSheetControls(fieldset, token, uniquePrefix, diagonalMode);
  } else {
    addDirectionalImageControls(
      fieldset,
      token,
      images,
      uniquePrefix,
      diagonalMode,
    );
  }

  addPrototypeAction(
    fieldset,
    token,
    images,
    movementMode,
    refreshControls,
  );
  setSheetPosition(sheet);
}

export async function createConfigButtons(sheet, element) {
  if (!game.settings.get(MODULE_NAME, "settingsMode")) return;
  if (game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;

  const root = getHtmlElement(sheet, element);
  const token = sheet.document ?? sheet.object;
  if (!root || !token || token.documentName !== "Token") return;

  const appearanceTab =
    root.querySelector('.tab[data-tab="appearance"]') ??
    root.querySelector('[data-tab="appearance"]');
  if (!appearanceTab || appearanceTab.querySelector(".movement-fieldset")) {
    return;
  }

  renderMovementControls(sheet, appearanceTab, token);
}
