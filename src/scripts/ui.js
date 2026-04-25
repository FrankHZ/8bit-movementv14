import { MODULE_NAME, imageLoader, initializeMovement } from "./functions.js";

function getHtmlElement(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (globalThis.jQuery && element instanceof globalThis.jQuery) {
    return element[0] ?? null;
  }
  return element[0] ?? null;
}

function getDirectionalImages(tokenDocument, fallbackImage) {
  return {
    up: tokenDocument.getFlag(MODULE_NAME, "up") || fallbackImage,
    down: tokenDocument.getFlag(MODULE_NAME, "down") || fallbackImage,
    left: tokenDocument.getFlag(MODULE_NAME, "left") || fallbackImage,
    right: tokenDocument.getFlag(MODULE_NAME, "right") || fallbackImage,
    UL: tokenDocument.getFlag(MODULE_NAME, "UL") || fallbackImage,
    UR: tokenDocument.getFlag(MODULE_NAME, "UR") || fallbackImage,
    DL: tokenDocument.getFlag(MODULE_NAME, "DL") || fallbackImage,
    DR: tokenDocument.getFlag(MODULE_NAME, "DR") || fallbackImage,
  };
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

  const createHudButton = (
    className,
    title,
    innerHtml,
    onClick,
    optionClass = "",
  ) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `movement-icon${optionClass ? ` ${optionClass}` : ""}`;
    button.dataset.action = className;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.innerHTML = innerHtml;
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
    imageBox.append(
      createHudButton(
        className,
        title,
        `<i class="${iconClass}"></i>`,
        onClick,
        optionClass,
      ),
    );
  };

  const appendImageButton = (className, title, src, onClick, label = "") => {
    const labelMarkup = label ? `<div>${label}</div>` : "";
    imageBox.append(
      createHudButton(
        className,
        title,
        `${labelMarkup}<img src="${src}" alt="${title}">`,
        onClick,
      ),
    );
  };

  if (!tokenDocument.flags.hasOwnProperty(MODULE_NAME)) {
    appendActionButton(
      "set-images",
      game.i18n.format("8BITMOVEMENT.activate"),
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
      game.i18n.format("8BITMOVEMENT.unlock"),
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
    game.i18n.format("8BITMOVEMENT.lock"),
    "fas fa-lock-open",
    async () => {
      await tokenDocument.setFlag(MODULE_NAME, "locked", true);
      sheet.render();
    },
  );

  appendImageButton(
    "up-image",
    game.i18n.format("8BITMOVEMENT.up"),
    images.up,
    async () => {
      await imageLoader(token.id, sheet, "up");
    },
  );
  appendImageButton(
    "down-image",
    game.i18n.format("8BITMOVEMENT.down"),
    images.down,
    async () => {
      await imageLoader(token.id, sheet, "down");
    },
  );
  appendImageButton(
    "left-image",
    game.i18n.format("8BITMOVEMENT.left"),
    images.left,
    async () => {
      await imageLoader(token.id, sheet, "left");
    },
  );
  appendImageButton(
    "right-image",
    game.i18n.format("8BITMOVEMENT.right"),
    images.right,
    async () => {
      await imageLoader(token.id, sheet, "right");
    },
  );

  if (game.settings.get(MODULE_NAME, "diagonalMode")) {
    appendImageButton(
      "up-left-image",
      game.i18n.format("8BITMOVEMENT.up-left"),
      images.UL,
      async () => {
        await imageLoader(token.id, sheet, "UL");
      },
      "UL",
    );
    appendImageButton(
      "up-right-image",
      game.i18n.format("8BITMOVEMENT.up-right"),
      images.UR,
      async () => {
        await imageLoader(token.id, sheet, "UR");
      },
      "UR",
    );
    appendImageButton(
      "down-left-image",
      game.i18n.format("8BITMOVEMENT.down-left"),
      images.DL,
      async () => {
        await imageLoader(token.id, sheet, "DL");
      },
      "DL",
    );
    appendImageButton(
      "down-right-image",
      game.i18n.format("8BITMOVEMENT.down-right"),
      images.DR,
      async () => {
        await imageLoader(token.id, sheet, "DR");
      },
      "DR",
    );
  }

  if (tokenDocument.getFlag(MODULE_NAME, "set")) {
    appendActionButton(
      "remove-from-prototype",
      game.i18n.format("8BITMOVEMENT.delete"),
      "fas fa-times",
      async () => {
        await clearPrototypeSettings(tokenDocument, images.down);
        sheet.render();
      },
    );
  } else {
    appendActionButton(
      "save-to-prototype",
      game.i18n.format("8BITMOVEMENT.save"),
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
    button.innerHTML = `<i class="${iconClass}" inert=""></i><span>${text}</span>`;
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
    previewButton.innerHTML = `<img src="${src}" alt="${title}">`;
    previewButton.addEventListener("click", async () => {
      await imageLoader(token.id, sheet, direction);
    });

    wrapper.append(picker, previewButton);
    return wrapper;
  };

  const uniquePrefix = sheet.options?.uniqueId ?? token.uuid ?? token.id;

  if (!token.flags.hasOwnProperty(MODULE_NAME)) {
    createFormGroup(game.i18n.format("8BITMOVEMENT.activate_label")).append(
      createActionButton(
        "activate",
        game.i18n.format("8BITMOVEMENT.activate"),
        "far fa-plus-square",
        "Activate",
        async () => {
          await initializeMovement(token.id);
          sheet.render();
        },
      ),
    );

    if (typeof sheet.setPosition === "function") sheet.setPosition();
    return;
  }

  createCheckboxGroup(
    game.i18n.format("8BITMOVEMENT.lock"),
    `${uniquePrefix}-locked`,
    !!token.getFlag(MODULE_NAME, "locked"),
    async (event) => {
      await token.setFlag(MODULE_NAME, "locked", event.currentTarget.checked);
      sheet.render();
    },
  );

  if (token.getFlag(MODULE_NAME, "locked")) {
    if (typeof sheet.setPosition === "function") sheet.setPosition();
    return;
  }

  createFormGroup(
    game.i18n.format("8BITMOVEMENT.up"),
    `${uniquePrefix}-up-image-path`,
  ).append(
    createImagePickerField(
      `${uniquePrefix}-up-image`,
      game.i18n.format("8BITMOVEMENT.up"),
      images.up,
      "up",
    ),
  );
  createFormGroup(
    game.i18n.format("8BITMOVEMENT.down"),
    `${uniquePrefix}-down-image-path`,
  ).append(
    createImagePickerField(
      `${uniquePrefix}-down-image`,
      game.i18n.format("8BITMOVEMENT.down"),
      images.down,
      "down",
    ),
  );
  createFormGroup(
    game.i18n.format("8BITMOVEMENT.left"),
    `${uniquePrefix}-left-image-path`,
  ).append(
    createImagePickerField(
      `${uniquePrefix}-left-image`,
      game.i18n.format("8BITMOVEMENT.left"),
      images.left,
      "left",
    ),
  );
  createFormGroup(
    game.i18n.format("8BITMOVEMENT.right"),
    `${uniquePrefix}-right-image-path`,
  ).append(
    createImagePickerField(
      `${uniquePrefix}-right-image`,
      game.i18n.format("8BITMOVEMENT.right"),
      images.right,
      "right",
    ),
  );

  if (game.settings.get(MODULE_NAME, "diagonalMode")) {
    createFormGroup(
      game.i18n.format("8BITMOVEMENT.up-left"),
      `${uniquePrefix}-up-left-image-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-up-left-image`,
        game.i18n.format("8BITMOVEMENT.up-left"),
        images.UL,
        "UL",
      ),
    );
    createFormGroup(
      game.i18n.format("8BITMOVEMENT.up-right"),
      `${uniquePrefix}-up-right-image-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-up-right-image`,
        game.i18n.format("8BITMOVEMENT.up-right"),
        images.UR,
        "UR",
      ),
    );
    createFormGroup(
      game.i18n.format("8BITMOVEMENT.down-left"),
      `${uniquePrefix}-down-left-image-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-down-left-image`,
        game.i18n.format("8BITMOVEMENT.down-left"),
        images.DL,
        "DL",
      ),
    );
    createFormGroup(
      game.i18n.format("8BITMOVEMENT.down-right"),
      `${uniquePrefix}-down-right-image-path`,
    ).append(
      createImagePickerField(
        `${uniquePrefix}-down-right-image`,
        game.i18n.format("8BITMOVEMENT.down-right"),
        images.DR,
        "DR",
      ),
    );
  }

  const actions = document.createElement("div");
  actions.className = "movement-actions";
  fieldset.append(actions);

  actions.append(
    token.getFlag(MODULE_NAME, "set")
      ? createActionButton(
          "remove",
          game.i18n.format("8BITMOVEMENT.delete"),
          "fa-solid fa-trash",
          game.i18n.format("8BITMOVEMENT.delete"),
          async () => {
            await clearPrototypeSettings(token, images.down);
            sheet.render();
          },
          "button",
          "button",
        )
      : createActionButton(
          "save",
          game.i18n.format("8BITMOVEMENT.save"),
          "fa-solid fa-floppy-disk",
          game.i18n.format("8BITMOVEMENT.save"),
          async (event) => {
            event.preventDefault();
            await savePrototypeSettings(token, images);
            sheet.render();
          },
          "submit",
          "button",
        ),
  );

  if (typeof sheet.setPosition === "function") sheet.setPosition();
}
