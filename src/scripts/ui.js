import { MODULE_NAME, imageLoader, initializeMovement } from "./functions.js";

const CARDINAL_DIRECTIONS = [
  { key: "up", action: "up-image", labelKey: "8BITMOVEMENT.up" },
  { key: "down", action: "down-image", labelKey: "8BITMOVEMENT.down" },
  { key: "left", action: "left-image", labelKey: "8BITMOVEMENT.left" },
  { key: "right", action: "right-image", labelKey: "8BITMOVEMENT.right" },
];

const DIAGONAL_DIRECTIONS = [
  {
    key: "UL",
    action: "up-left-image",
    labelKey: "8BITMOVEMENT.up-left",
    hudLabel: "UL",
  },
  {
    key: "UR",
    action: "up-right-image",
    labelKey: "8BITMOVEMENT.up-right",
    hudLabel: "UR",
  },
  {
    key: "DL",
    action: "down-left-image",
    labelKey: "8BITMOVEMENT.down-left",
    hudLabel: "DL",
  },
  {
    key: "DR",
    action: "down-right-image",
    labelKey: "8BITMOVEMENT.down-right",
    hudLabel: "DR",
  },
];

function localize(key) {
  return game.i18n.format(key);
}

function getHtmlElement(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (globalThis.jQuery && element instanceof globalThis.jQuery) {
    return element[0] ?? null;
  }
  return element?.[0] ?? null;
}

function hasMovementFlags(tokenDocument) {
  return Object.hasOwn(tokenDocument.flags ?? {}, MODULE_NAME);
}

function getDirectionalImages(tokenDocument, fallbackImage) {
  const images = {};
  for (const direction of [...CARDINAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]) {
    images[direction.key] =
      tokenDocument.getFlag(MODULE_NAME, direction.key) || fallbackImage;
  }
  return images;
}

function setSheetPosition(sheet) {
  if (typeof sheet.setPosition === "function") sheet.setPosition();
}

async function clearPrototypeSettings(tokenDocument, image) {
  await game.actors.get(tokenDocument.actor.id).update({
    "prototypeToken.flags.-=8bit-movement": null,
    "prototypeToken.texture.src": image,
    "prototypeToken.lockRotation": false,
  });

  await tokenDocument.update({
    "flags.-=8bit-movement": null,
    "texture.src": image,
    lockRotation: false,
    rotation: 0,
  });
}

async function savePrototypeSettings(tokenDocument, images) {
  await game.actors.get(tokenDocument.actor.id).update({
    "prototypeToken.flags.8bit-movement": {
      up: images.up,
      down: images.down,
      left: images.left,
      right: images.right,
      set: true,
    },
    "prototypeToken.texture.src": images.down,
    "prototypeToken.lockRotation": true,
  });

  await tokenDocument.setFlag(MODULE_NAME, "set", true);
}

export async function createHudButtons(sheet, element) {
  if (!game.settings.get(MODULE_NAME, "tokenMode")) return;
  if (game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;

  const root = getHtmlElement(sheet, element);
  const token = sheet.object ?? sheet.token;
  const tokenDocument = sheet.document ?? token?.document;
  if (!root || !token || !tokenDocument) return;

  const middleColumn = root.querySelector(".col.middle");
  if (!middleColumn || middleColumn.querySelector(".image-box")) return;

  const imageBox = document.createElement("div");
  imageBox.className = "image-box";
  middleColumn.append(imageBox);

  const createHudButton = (className, title, onClick, optionClass = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `movement-icon${optionClass ? ` ${optionClass}` : ""}`;
    button.dataset.action = className;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", onClick);
    return button;
  };

  const appendActionButton = (
    className,
    title,
    iconClass,
    onClick,
    optionClass = "option",
  ) => {
    const button = createHudButton(className, title, onClick, optionClass);
    const icon = document.createElement("i");
    icon.className = iconClass;
    button.append(icon);
    imageBox.append(button);
  };

  const appendImageButton = (className, title, src, onClick, label = "") => {
    const button = createHudButton(className, title, onClick);

    if (label) {
      const labelElement = document.createElement("div");
      labelElement.textContent = label;
      button.append(labelElement);
    }

    const image = document.createElement("img");
    image.src = src;
    image.alt = title;
    button.append(image);
    imageBox.append(button);
  };

  if (!hasMovementFlags(tokenDocument)) {
    appendActionButton(
      "set-images",
      localize("8BITMOVEMENT.activate"),
      "far fa-plus-square",
      async () => {
        await initializeMovement(token.id);
        sheet.render();
      },
      "option middle",
    );
    return;
  }

  if (tokenDocument.getFlag(MODULE_NAME, "locked")) {
    appendActionButton(
      "unlock-images",
      localize("8BITMOVEMENT.unlock"),
      "fas fa-lock",
      async () => {
        await tokenDocument.setFlag(MODULE_NAME, "locked", false);
        sheet.render();
      },
      "option middle",
    );
    return;
  }

  const fallbackImage = tokenDocument.texture?.src ?? token.actor?.img ?? "";
  const images = getDirectionalImages(tokenDocument, fallbackImage);

  appendActionButton(
    "lock-images",
    localize("8BITMOVEMENT.lock"),
    "fas fa-lock-open",
    async () => {
      await tokenDocument.setFlag(MODULE_NAME, "locked", true);
      sheet.render();
    },
  );

  for (const direction of CARDINAL_DIRECTIONS) {
    appendImageButton(
      direction.action,
      localize(direction.labelKey),
      images[direction.key],
      async () => {
        await imageLoader(token.id, sheet, direction.key);
      },
    );
  }

  if (game.settings.get(MODULE_NAME, "diagonalMode")) {
    for (const direction of DIAGONAL_DIRECTIONS) {
      appendImageButton(
        direction.action,
        localize(direction.labelKey),
        images[direction.key],
        async () => {
          await imageLoader(token.id, sheet, direction.key);
        },
        direction.hudLabel,
      );
    }
  }

  if (tokenDocument.getFlag(MODULE_NAME, "set")) {
    appendActionButton(
      "remove-from-prototype",
      localize("8BITMOVEMENT.delete"),
      "fas fa-times",
      async () => {
        await clearPrototypeSettings(tokenDocument, images.down);
        sheet.render();
      },
    );
  } else {
    appendActionButton(
      "save-to-prototype",
      localize("8BITMOVEMENT.save"),
      "fas fa-address-card",
      async () => {
        await savePrototypeSettings(tokenDocument, images);
        sheet.render();
      },
    );
  }
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

  const fallbackImage = token.texture?.src ?? token.actor?.img ?? "";
  const images = getDirectionalImages(token, fallbackImage);

  const fieldset = document.createElement("fieldset");
  fieldset.className = "movement-fieldset";

  const legend = document.createElement("legend");
  legend.className = "movement-legend";
  legend.textContent = "8bit Movement";
  fieldset.append(legend);
  appearanceTab.append(fieldset);

  const createFormGroup = (labelText, inputId) => {
    const group = document.createElement("div");
    group.className = "form-group movement-form-group";

    const label = document.createElement("label");
    label.textContent = labelText;
    if (inputId) label.htmlFor = inputId;

    const fields = document.createElement("div");
    fields.className = "form-fields";

    group.append(label, fields);
    fieldset.append(group);
    return fields;
  };

  const createActionButton = (
    className,
    title,
    iconClass,
    text,
    onClick,
    type = "button",
    buttonClass = "movement-settings movement-action-button",
  ) => {
    const button = document.createElement("button");
    button.type = type;
    button.className = `${buttonClass} ${className}`.trim();
    button.title = title;
    button.setAttribute("aria-label", title);
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("inert", "");
    const label = document.createElement("span");
    label.textContent = text;
    button.append(icon, label);
    button.addEventListener("click", onClick);
    return button;
  };

  const createCheckboxGroup = (labelText, inputId, checked, onChange) => {
    const fields = createFormGroup(labelText, inputId);
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = inputId;
    input.checked = checked;
    input.addEventListener("change", onChange);
    fields.append(input);
    return input;
  };

  const createImagePickerField = (id, title, src, direction) => {
    const wrapper = document.createElement("div");
    wrapper.className = "movement-image-field";
    const inputId = `${id}-path`;

    const picker = document.createElement("file-picker");
    picker.setAttribute("type", "imagevideo");
    picker.setAttribute("name", `${MODULE_NAME}.${direction}`);
    picker.setAttribute("value", src);
    picker.id = `${id}-picker`;

    const input = document.createElement("input");
    input.className = "image";
    input.type = "text";
    input.id = inputId;
    input.placeholder = "path/to/file.ext";
    input.value = src;
    input.readOnly = true;

    const browseButton = document.createElement("button");
    browseButton.className = "fa-solid fa-file-import fa-fw icon";
    browseButton.type = "button";
    browseButton.dataset.tooltip = "FILES.BrowseTooltip";
    browseButton.setAttribute(
      "aria-label",
      game.i18n.localize("FILES.BrowseTooltip"),
    );
    browseButton.tabIndex = -1;
    browseButton.addEventListener("click", async () => {
      await imageLoader(token.id, sheet, direction);
    });

    picker.append(input, browseButton);

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.id = id;
    previewButton.className = "movement-settings movement-preview-button";
    previewButton.title = title;
    previewButton.setAttribute("aria-label", title);
    const previewImage = document.createElement("img");
    previewImage.src = src;
    previewImage.alt = title;
    previewButton.append(previewImage);
    previewButton.addEventListener("click", async () => {
      await imageLoader(token.id, sheet, direction);
    });

    wrapper.append(picker, previewButton);
    return wrapper;
  };

  const uniquePrefix = sheet.options?.uniqueId ?? token.uuid ?? token.id;

  const addImagePickerGroup = (direction) => {
    createFormGroup(
      localize(direction.labelKey),
      `${uniquePrefix}-${direction.action}-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-${direction.action}`,
        localize(direction.labelKey),
        images[direction.key],
        direction.key,
      ),
    );
  };

  if (!hasMovementFlags(token)) {
    createFormGroup(localize("8BITMOVEMENT.activate_label")).append(
      createActionButton(
        "activate",
        localize("8BITMOVEMENT.activate"),
        "far fa-plus-square",
        "Activate",
        async () => {
          await initializeMovement(token.id);
          sheet.render();
        },
      ),
    );

    setSheetPosition(sheet);
    return;
  }

  createCheckboxGroup(
    localize("8BITMOVEMENT.lock"),
    `${uniquePrefix}-locked`,
    !!token.getFlag(MODULE_NAME, "locked"),
    async (event) => {
      await token.setFlag(MODULE_NAME, "locked", event.currentTarget.checked);
      sheet.render();
    },
  );

  if (token.getFlag(MODULE_NAME, "locked")) {
    setSheetPosition(sheet);
    return;
  }

  for (const direction of CARDINAL_DIRECTIONS) addImagePickerGroup(direction);

  if (game.settings.get(MODULE_NAME, "diagonalMode")) {
    for (const direction of DIAGONAL_DIRECTIONS) {
      addImagePickerGroup(direction);
    }
  }

  const actions = document.createElement("div");
  actions.className = "movement-actions";
  fieldset.append(actions);

  actions.append(
    token.getFlag(MODULE_NAME, "set")
      ? createActionButton(
          "remove",
          localize("8BITMOVEMENT.delete"),
          "fa-solid fa-trash",
          localize("8BITMOVEMENT.delete"),
          async () => {
            await clearPrototypeSettings(token, images.down);
            sheet.render();
          },
          "button",
          "button",
        )
      : createActionButton(
          "save",
          localize("8BITMOVEMENT.save"),
          "fa-solid fa-floppy-disk",
          localize("8BITMOVEMENT.save"),
          async (event) => {
            event.preventDefault();
            await savePrototypeSettings(token, images);
            sheet.render();
          },
          "submit",
          "button",
        ),
  );

  setSheetPosition(sheet);
}
