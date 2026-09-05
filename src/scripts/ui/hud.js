import {
  MODULE_NAME,
  imageLoader,
  initializeMovement,
} from "../functions.js";
import {
  getIsometricPerspectiveMode,
  SPRITE_SHEET_MODE,
} from "../constants.js";
import {
  getPreviewLayoutDirection,
  projectDirectionToScreen,
} from "../directions.js";
import {
  CARDINAL_DIRECTIONS,
  DIAGONAL_DIRECTIONS,
  browseSpriteSheet,
  clearTokenSettings,
  getDirectionalImages,
  getHtmlElement,
  getMovementMode,
  getSpriteSheetConfig,
  getTokenDiagonalMode,
  hasMovementFlags,
  localize,
} from "./shared.js";
import { createSpriteSheetPreview } from "./sprite-preview.js";
import { createMediaPreview } from "./dom.js";

const DIRECTION_GLYPHS = Object.freeze({
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  "up-left": "↖",
  "up-right": "↗",
  "down-left": "↙",
  "down-right": "↘",
});
const collapsedHudPanels = new Set();

function createToolbarButton({ action, title, iconClass, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "movement-hud-tool";
  button.dataset.action = action;
  button.title = title;
  button.setAttribute("aria-label", title);
  const icon = document.createElement("i");
  icon.className = iconClass;
  button.append(icon);
  button.addEventListener("click", onClick);
  return button;
}

function createPanel(modeLabel, stateClass = "") {
  const panel = document.createElement("section");
  panel.className = `movement-hud-panel${stateClass ? ` ${stateClass}` : ""}`;

  const toolbar = document.createElement("header");
  toolbar.className = "movement-hud-toolbar";
  const title = document.createElement("span");
  title.className = "movement-hud-title";
  const icon = document.createElement("i");
  icon.className = "fas fa-person-walking";
  const label = document.createElement("span");
  label.textContent = modeLabel;
  title.append(icon, label);
  const tools = document.createElement("div");
  tools.className = "movement-hud-tools";
  toolbar.append(title, tools);

  const body = document.createElement("div");
  body.className = "movement-hud-body";
  panel.append(toolbar, body);
  return { panel, tools, body };
}

function appendPanelVisibilityToggle(
  panel,
  tools,
  body,
  tokenDocument,
) {
  const panelKey = tokenDocument.uuid ?? tokenDocument.id;
  const button = createToolbarButton({
    action: "toggle-panel",
    title: "",
    iconClass: "",
    onClick: () => {
      if (collapsedHudPanels.has(panelKey)) collapsedHudPanels.delete(panelKey);
      else collapsedHudPanels.add(panelKey);
      applyState();
    },
  });

  const applyState = () => {
    const collapsed = collapsedHudPanels.has(panelKey);
    panel.classList.toggle("collapsed", collapsed);
    body.hidden = collapsed;
    button.title = localize(
      collapsed
        ? "8BITMOVEMENT.Show-HUD-Panel"
        : "8BITMOVEMENT.Hide-HUD-Panel",
    );
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.firstElementChild.className = collapsed
      ? "fas fa-eye"
      : "fas fa-eye-slash";
  };

  tools.append(button);
  applyState();
}

function createActivationButton({ title, iconClass, text, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "movement-hud-activate";
  button.title = title;
  const icon = document.createElement("i");
  icon.className = iconClass;
  const label = document.createElement("span");
  label.textContent = text;
  button.append(icon, label);
  button.addEventListener("click", onClick);
  return button;
}

function appendActivationPanel(middleColumn, token, tokenDocument, sheet) {
  const { panel, tools, body } = createPanel("8bit Movement", "activation");
  body.classList.add("movement-hud-activation-actions");
  body.append(
    createActivationButton({
      title: localize("8BITMOVEMENT.activate"),
      iconClass: "far fa-images",
      text: localize("8BITMOVEMENT.Mode-Separate"),
      onClick: async () => {
        await initializeMovement(token.id, { render: false });
        sheet.render();
      },
    }),
    createActivationButton({
      title: localize("8BITMOVEMENT.Sprite-Sheet-Activate"),
      iconClass: "fas fa-table-cells",
      text: localize("8BITMOVEMENT.Mode-Sheet"),
      onClick: async () => {
        await browseSpriteSheet(tokenDocument, () => sheet.render());
      },
    }),
  );
  appendPanelVisibilityToggle(panel, tools, body, tokenDocument);
  middleColumn.append(panel);
}

function createDirectionButton(
  direction,
  src,
  token,
  sheet,
  locked,
  diagonalMode,
  isometric,
) {
  const screenDirection = projectDirectionToScreen(
    direction.key,
    isometric,
  );
  const layoutDirection = getPreviewLayoutDirection(direction.key, {
    eightWay: diagonalMode,
    isometric,
  });
  const title = localize(direction.labelKey);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "movement-hud-direction";
  button.dataset.direction = direction.key;
  button.dataset.screenDirection = screenDirection;
  button.dataset.layoutDirection = layoutDirection;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.disabled = locked;

  const image = createMediaPreview(src, title);
  const glyph = document.createElement("span");
  glyph.className = "movement-hud-direction-glyph";
  glyph.textContent = DIRECTION_GLYPHS[screenDirection];
  button.append(image, glyph);
  if (!locked) {
    button.addEventListener("click", async () => {
      await imageLoader(token.id, sheet, direction.imageFlag);
    });
  }
  return button;
}

function appendDirectionalPreview(
  body,
  token,
  sheet,
  images,
  locked,
  diagonalMode,
  isometric,
) {
  body.classList.add("movement-hud-preview-body");
  const grid = document.createElement("div");
  grid.className = "movement-direction-grid movement-hud-direction-grid";
  grid.classList.toggle("isometric", isometric);
  grid.classList.toggle("diagonal", diagonalMode);
  for (const direction of CARDINAL_DIRECTIONS) {
    grid.append(
      createDirectionButton(
        direction,
        images[direction.key],
        token,
        sheet,
        locked,
        diagonalMode,
        isometric,
      ),
    );
  }
  if (diagonalMode) {
    for (const direction of DIAGONAL_DIRECTIONS) {
      grid.append(
        createDirectionButton(
          direction,
          images[direction.key],
          token,
          sheet,
          locked,
          diagonalMode,
          isometric,
        ),
      );
    }
  }

  const center = document.createElement("div");
  center.className = "movement-hud-grid-center";
  const icon = document.createElement("i");
  icon.className = locked ? "fas fa-lock" : "fas fa-compass";
  center.append(icon);
  grid.append(center);
  body.append(grid);
}

function appendSpriteSheetPreview(
  body,
  tokenDocument,
  sheet,
  locked,
  diagonalMode,
  isometric,
) {
  body.classList.add("movement-hud-preview-body");
  const config = getSpriteSheetConfig(tokenDocument);
  const preview = createSpriteSheetPreview({
    compact: true,
    diagonal: diagonalMode,
    errorsOnly: true,
    showLabels: false,
    isometric,
    onActivate: locked
      ? undefined
      : async () => {
          await browseSpriteSheet(tokenDocument, () => sheet.render());
        },
  });
  body.append(preview.element);
  void preview.update(config);
}

function appendToolbarActions(
  tools,
  tokenDocument,
  sheet,
  movementMode,
  images,
  locked,
  diagonalMode,
) {
  if (movementMode === SPRITE_SHEET_MODE && !locked) {
    tools.append(
      createToolbarButton({
        action: "change-sprite-sheet",
        title: localize("8BITMOVEMENT.Sprite-Sheet-Image"),
        iconClass: "fas fa-file-image",
        onClick: async () => {
          await browseSpriteSheet(tokenDocument, () => sheet.render());
        },
      }),
    );
  }

  if (!locked) {
    tools.append(
      createToolbarButton({
        action: "toggle-diagonal",
        title: localize(
          diagonalMode
            ? "8BITMOVEMENT.Use-Four-Directions"
            : "8BITMOVEMENT.Use-Eight-Directions",
        ),
        iconClass: "fas fa-arrows-up-down-left-right",
        onClick: async () => {
          await tokenDocument.update(
            { [`flags.${MODULE_NAME}.diagonalMode`]: !diagonalMode },
            { render: false },
          );
          sheet.render();
        },
      }),
    );
    tools.lastElementChild.classList.toggle("active", diagonalMode);
  }

  tools.append(
    createToolbarButton({
      action: locked ? "unlock" : "lock",
      title: localize(
        locked ? "8BITMOVEMENT.unlock" : "8BITMOVEMENT.lock",
      ),
      iconClass: locked ? "fas fa-lock" : "fas fa-lock-open",
      onClick: async () => {
        await tokenDocument.update(
          { [`flags.${MODULE_NAME}.locked`]: !locked },
          { render: false },
        );
        sheet.render();
      },
    }),
  );

  if (locked) return;
  tools.append(
    createToolbarButton({
      action: "clear-token",
      title: localize("8BITMOVEMENT.clear-token"),
      iconClass: "fas fa-eraser",
      onClick: async () => {
        await clearTokenSettings(
          tokenDocument,
          movementMode === SPRITE_SHEET_MODE
            ? tokenDocument.texture.src
            : images.down,
          { render: false },
        );
        sheet.render();
      },
    }),
  );
}

export async function createHudButtons(sheet, element) {
  if (!game.settings.get(MODULE_NAME, "tokenMode")) return;
  if (game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;

  const root = getHtmlElement(sheet, element);
  const token = sheet.object ?? sheet.token;
  const tokenDocument = sheet.document ?? token?.document;
  if (!root || !token || !tokenDocument) return;

  const middleColumn = root.querySelector(".col.middle");
  if (!middleColumn || middleColumn.querySelector(".movement-hud-panel")) return;

  if (!hasMovementFlags(tokenDocument)) {
    appendActivationPanel(middleColumn, token, tokenDocument, sheet);
    return;
  }

  const fallbackImage = tokenDocument.texture?.src ?? token.actor?.img ?? "";
  const images = getDirectionalImages(tokenDocument, fallbackImage);
  const movementMode = getMovementMode(tokenDocument);
  const diagonalMode = getTokenDiagonalMode(tokenDocument);
  const isometric = getIsometricPerspectiveMode();
  const locked = !!tokenDocument.getFlag(MODULE_NAME, "locked");
  const modeLabel = `${localize(
    movementMode === SPRITE_SHEET_MODE
      ? "8BITMOVEMENT.Mode-Sheet"
      : "8BITMOVEMENT.Mode-Separate",
  )} · ${localize(
    diagonalMode
      ? "8BITMOVEMENT.Eight-Directions"
      : "8BITMOVEMENT.Four-Directions",
  )}`;
  const { panel, tools, body } = createPanel(modeLabel);
  panel.dataset.perspective = isometric ? "isometric" : "standard";
  appendToolbarActions(
    tools,
    tokenDocument,
    sheet,
    movementMode,
    images,
    locked,
    diagonalMode,
  );
  appendPanelVisibilityToggle(panel, tools, body, tokenDocument);

  if (movementMode === SPRITE_SHEET_MODE) {
    appendSpriteSheetPreview(
      body,
      tokenDocument,
      sheet,
      locked,
      diagonalMode,
      isometric,
    );
  } else {
    appendDirectionalPreview(
      body,
      token,
      sheet,
      images,
      locked,
      diagonalMode,
      isometric,
    );
  }
  middleColumn.append(panel);
}
