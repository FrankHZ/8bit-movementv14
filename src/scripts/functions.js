//change image titles for tooltips from Foundry API looks nicer.
const MODULE_NAME = "8bit-movement";
const __8bitPersistTimers = new Map();

function getElementRoot(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  return element instanceof HTMLElement ? $(element) : $(element);
}

function getHtmlElement(application, fallbackElement) {
  const element = fallbackElement ?? application?.element;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (globalThis.jQuery && element instanceof globalThis.jQuery) return element[0] ?? null;
  return element[0] ?? null;
}


// --- 8bit-movement: smooth move + no-fade helpers ---
const __8BIT_SWAP_DELAY_MS = 200; // delay to let movement tween start; adjust to taste

function __8bit_forceOpaque(placeable) {
  try {
    if (!placeable) return;
    placeable.alpha = 1;
    if (placeable.icon) placeable.icon.alpha = 1;
    if (placeable.mesh) placeable.mesh.alpha = 1;
  } catch (e) {
    console.warn("8bit-movement: forceOpaque failed", e);
  }
}

async function __8bit_swapAfterMoveNoFade(doc, placeable, src) {
  try {
    if (!doc || !placeable || !src) return;
    if (placeable.texture?.src === src) return;
    await doc.update({ "texture.src": src }, { animate: false });
    const kicks = [0, 16, 48, 96, 160, 240];
    for (const t of kicks) setTimeout(() => __8bit_forceOpaque(placeable), t);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => __8bit_forceOpaque(placeable));
    }
  } catch (e) {
    console.warn("8bit-movement: swapAfterMoveNoFade failed", e);
  }
}

/** Preview the given src on the on-canvas token (no document write, no refresh). */
function __8bit_previewMesh(tokenId, src) {
  try {
    const pl = canvas?.tokens?.get(tokenId);
    if (!pl || !src) return;
    const tex = (typeof PIXI !== "undefined" && PIXI.Texture) ? PIXI.Texture.from(src) : null;
    if (!tex) return;
    if (pl.mesh) pl.mesh.texture = tex;
    else if (pl.icon) pl.icon.texture = tex;
    __8bit_forceOpaque(pl);
  } catch (e) { /* ignore preview errors */ }
}

/**
 * Sets up the flags for the image paths when pressing the [+] button on the Token HUD or Token Config.
 * does some string searching to figure out if you used upper case or lower case for the direction tag on your images.
 * @param {string} tokenId | id string of token which is getting its images set.
 */
 async function initializeMovement(tokenId){
    const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
    const token = canvas.tokens.get(tokenId);
    const imagePath = token.document.texture.src.substring(token.document.texture.src.lastIndexOf("/") + 1, token.document.texture.src.lastIndexOf("."));
    let  directions = ["up", "down", "left", "right", "UP", "DOWN", "LEFT", "RIGHT"];
    const hasDirection = directions.find(d => imagePath.includes(d));
    const isLowerCase = directions.indexOf(hasDirection) < 4 ? true : false;
    directions = isLowerCase ? directions : directions.map(d => d.toUpperCase());
    if (diagonalMode) directions = directions.concat(isLowerCase ? ["ul","ur","dl","dr"] : ["UL", "UR", "DL", "DR"])
    if(!hasDirection) {
        await token.document.setFlag(MODULE_NAME, "up",    token.document.texture.src);
        await token.document.setFlag(MODULE_NAME, "down",  token.document.texture.src);
        await token.document.setFlag(MODULE_NAME, "left",  token.document.texture.src);
        await token.document.setFlag(MODULE_NAME, "right", token.document.texture.src);
        if(diagonalMode){
            await token.document.setFlag(MODULE_NAME, "UL", token.document.texture.src);
            await token.document.setFlag(MODULE_NAME, "UR", token.document.texture.src);
            await token.document.setFlag(MODULE_NAME, "DL", token.document.texture.src);
            await token.document.setFlag(MODULE_NAME, "DR", token.document.texture.src);
        }
    }
    else {
        await token.document.setFlag(MODULE_NAME, "up",    token.document.texture.src.replace(hasDirection, directions[0]));
        await token.document.setFlag(MODULE_NAME, "down",  token.document.texture.src.replace(hasDirection, directions[1]));
        await token.document.setFlag(MODULE_NAME, "left",  token.document.texture.src.replace(hasDirection, directions[2]));
        await token.document.setFlag(MODULE_NAME, "right", token.document.texture.src.replace(hasDirection, directions[3]));
        if(diagonalMode){
            await token.document.setFlag(MODULE_NAME, "UL", token.document.texture.src.replace(hasDirection, directions[8]));
            await token.document.setFlag(MODULE_NAME, "UR", token.document.texture.src.replace(hasDirection, directions[9]));
            await token.document.setFlag(MODULE_NAME, "DL", token.document.texture.src.replace(hasDirection, directions[10]));
            await token.document.setFlag(MODULE_NAME, "DR", token.document.texture.src.replace(hasDirection, directions[11]));
        }
    }
    
    await token.document.update({lockRotation: true, rotation: 1})
}

/**
 * This function opens a file picker with the right limitation on what type of file is possible (images and webM).
 * Sets the path of the file in the appropriate flag on the Token.
 * @param {string} tokenId | id string of the token being moved.
 * @param {object} sheet | sheet is an object passed on via renderTokenHud hook.
 * @param {string} direction | string indicating the direction of the token.
 */
async function imageLoader(tokenId, sheet, direction) {
    const token = canvas.tokens.get(tokenId);
    let pickedFile = await new FilePicker({
        type: "imagevideo",
        callback: async (path) => {
            await token.document.setFlag(MODULE_NAME, direction, path);
            sheet.render();
        }
    });
    pickedFile.browse();
}

/**
 * This function adds a listener for the keyup event updating the token in motion with WSAD/Arrow keys,
 * maintains a 0 rotation on SHIFT usage for tokens with the right flags.
 */
export async function addListener() {
      Hooks.on("refreshToken", (pl) => {
    try {
      const next = pl?.document?.getFlag(MODULE_NAME, "__nextTexture");
      if (next) __8bit_previewMesh(pl.id, next);
    } catch (_e) {}
  });
const diagonalMode = game.settings.get(MODULE_NAME, "diagonalMode");
    Hooks.on("preUpdateToken", function changeImage(token, change, options) {
        if(!token.flags[MODULE_NAME]) return;
        if(!token.getFlag(MODULE_NAME, "up") &&
            !token.getFlag(MODULE_NAME, "down") &&
            !token.getFlag(MODULE_NAME, "right") &&
            !token.getFlag(MODULE_NAME, "left")
        ) {
            if (!game.settings.get(MODULE_NAME, "warnings")) ui.notifications.warn(game.i18n.localize("8BITMOVEMENT.Warn.No_Images"));
            return;
        }
        const move = foundry.utils.hasProperty(change, "x") || foundry.utils.hasProperty(change, "y");
        const rotation = foundry.utils.hasProperty(change, "rotation");
        if ( move ) {
            let direction = "";
            if(diagonalMode){
                if(!token.getFlag(MODULE_NAME, "UL") &&
                    !token.getFlag(MODULE_NAME, "UR") &&
                    !token.getFlag(MODULE_NAME, "DL") &&
                    !token.getFlag(MODULE_NAME, "DR")
                ) {
                    if (!game.settings.get(MODULE_NAME, "warnings")) ui.notifications.warn(game.i18n.localize("8BITMOVEMENT.Warn.No_Images_Diagonal"));
                    return;
                }
                if(token.x === change.x && token.y === change.y) return;
                if(token.x > change.x && token.y === change.y) direction = "left";
                if(token.x < change.x && token.y === change.y) direction = "right";
                if(token.y > change.y && token.x === change.x) direction = "up";
                if(token.y < change.y && token.x === change.x) direction = "down";
                if(token.x > change.x && token.y > change.y) direction = "up-left";
                if(token.x < change.x && token.y > change.y) direction = "up-right";
                if(token.x > change.x && token.y < change.y) direction = "down-left";
                if(token.x < change.x && token.y < change.y) direction = "down-right";
            } else {
                if(token.x > change.x) direction = "left";
                if(token.x < change.x) direction = "right";
                if(token.y > change.y) direction = "up";
                if(token.y < change.y) direction = "down";
            }
            if(direction === "up") {
                if(token.texture.src === token.flags[MODULE_NAME].up) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].up); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].up);
            }
            if(direction === "down") {
                if(token.texture.src === token.flags[MODULE_NAME].down) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].down); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].down);
            }
            if(direction === "left") {
                if(token.texture.src === token.flags[MODULE_NAME].left) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].left); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].left);
            }
            if(direction === "right") {
                if(token.texture.src === token.flags[MODULE_NAME].right) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].right); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].right);
            }
            if(direction === "up-left") {
                if(token.texture.src === token.flags[MODULE_NAME].UL) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].UL); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].UL);                
            }
            if(direction === "up-right") {
                if(token.texture.src === token.flags[MODULE_NAME].UR) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].UR); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].UR);                  
            }
            if(direction === "down-left") {
                if(token.texture.src === token.flags[MODULE_NAME].DL) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].DL); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].DL);                
            }
            if(direction === "down-right") {
                if(token.texture.src === token.flags[MODULE_NAME].DR) return;
                foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].DR); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].DR);                 
            }
        }
        else if(rotation) {
            switch(foundry.utils.getProperty(change, "rotation")){
                case 0: 
                    if(token.texture.src === token.flags[MODULE_NAME].down) return;
                    foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].down); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].down);
                    break;
                case 90: 
                    if(token.texture.src === token.flags[MODULE_NAME].left) return;
                    foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].left); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].left);
                    break;
                case 180: 
                    if(token.texture.src === token.flags[MODULE_NAME].up) return;
                    foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].up); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].up);
                    break;
                case 270: 
                    if(token.texture.src === token.flags[MODULE_NAME].right) return;
                    foundry.utils.setProperty(change, "flags.8bit-movement.__nextTexture", token.flags[MODULE_NAME].right); __8bit_previewMesh(token.id, token.flags[MODULE_NAME].right);
                    break;
                default: break;
            }
        }});
}

/**
 * This function adds buttons to the Token HUD. Allowing for modifications to be done.
 * @param {object} sheet | recieves the sheet from the renderTokenHud hook.
 */
export async function createHudButtons(sheet, element) {
    if(!game.settings.get(MODULE_NAME, "tokenMode")) return;
    if(game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;
    const root = getElementRoot(sheet, element);
    const token = sheet.object;
    if (!root || !token) return;
    const middleColumn = root.find(".col.middle");
    if (!middleColumn.length || middleColumn.find(".image-box").length) return;
    middleColumn.append(`<div class="image-box"></div>`);
    if(!token.document.flags.hasOwnProperty(MODULE_NAME)) {
        root.find(".image-box").append(`<div class="movement-icon option middle" id="set-images"><i class="far fa-plus-square" title="${game.i18n.format("8BITMOVEMENT.activate")}"></i></div>`);
        root.find("#set-images").click(async function() { 
            await initializeMovement(token.id); 
            sheet.render();
        });
    } else {
        if(token.document.getFlag(MODULE_NAME, "locked")) {
            root.find(".image-box").append(`<div class="movement-icon option middle" id="unlock-images" ><i class="fas fa-lock" title="${game.i18n.format("8BITMOVEMENT.unlock")}"></i></div></div>`);
            root.find("#unlock-images").click(async function(){
                root.find(".image-box").empty();
                await token.document.setFlag(MODULE_NAME, "locked", false);
                sheet.render();
            });
            return;
        }
        const upImage = token.document.getFlag(MODULE_NAME, "up") || token.actor.img;
        const downImage = token.document.getFlag(MODULE_NAME, "down") || token.actor.img;
        const leftImage = token.document.getFlag(MODULE_NAME, "left") || token.actor.img;
        const rightImage = token.document.getFlag(MODULE_NAME, "right") || token.actor.img;
        const upLeftImage = token.document.getFlag(MODULE_NAME, "UL") || token.actor.img;
        const upRightImage = token.document.getFlag(MODULE_NAME, "UR") || token.actor.img;
        const downLeftImage = token.document.getFlag(MODULE_NAME, "DL") || token.actor.img;
        const downRightImage = token.document.getFlag(MODULE_NAME, "DR") || token.actor.img;

        root.find(".image-box").append(`<div class="movement-icon option" id="lock-images" ><i class="fas fa-lock-open" title="${game.i18n.format("8BITMOVEMENT.lock")}"></i></div>`);
        root.find("#lock-images").click(async function(){
            await token.document.setFlag(MODULE_NAME, "locked", true);
            root.find(".image-box").empty();
            root.find(".image-box").append(`<div class="movement-icon option middle" id="unlock-images" ><i class="fas fa-lock" title="${game.i18n.format("8BITMOVEMENT.unlock")}"></i></div>`);
            root.find("#unlock-images").click(async function(){
                root.find(".image-box").empty();
                await token.document.setFlag(MODULE_NAME, "locked", false);
                sheet.render();
            });
        });    
        root.find(".image-box").append(`<div class="movement-icon" id="up-image" ><i class="fas fa-angle-up"></i><img src="${upImage}" title="${game.i18n.format("8BITMOVEMENT.up")}"></div>`);
        root.find("#up-image").click(async function(){
            await imageLoader(token.id, sheet, "up");
        });
        root.find(".image-box").append(`<div class="movement-icon" id="down-image" ><i class="fas fa-angle-down"></i><img src="${downImage}" title="${game.i18n.format("8BITMOVEMENT.down")}"></div>`);
        root.find("#down-image").click(async function(){
            await imageLoader(token.id, sheet, "down");
        });
        root.find(".image-box").append(`<div class="movement-icon" id="left-image" ><i class="fas fa-angle-left" ></i><img src="${leftImage}" title="${game.i18n.format("8BITMOVEMENT.left")}"></div>`);
        root.find("#left-image").click(async function(){
            await imageLoader(token.id, sheet, "left");
        });
        root.find(".image-box").append(`<div class="movement-icon" id="right-image" ><i class="fas fa-angle-right"></i><img src="${rightImage}" title="${game.i18n.format("8BITMOVEMENT.right")}"></div>`);
        root.find("#right-image").click(async function(){
            await imageLoader(token.id, sheet, "right");
        });
        if(game.settings.get(MODULE_NAME, "diagonalMode")){
            root.find(".image-box").append(`<div class="movement-icon" id="up-left-image" ><div>UL</div><img src="${upLeftImage}" title="${game.i18n.format("8BITMOVEMENT.up-left")}"></div>`);
            root.find("#up-left-image").click(async function(){
                await imageLoader(token.id, sheet, "UL");
            });
            root.find(".image-box").append(`<div class="movement-icon" id="up-right-image" ><div>UR</div><img src="${upRightImage}" title="${game.i18n.format("8BITMOVEMENT.up-right")}"></div>`);
            root.find("#up-right-image").click(async function(){
                await imageLoader(token.id, sheet, "UR");
            });
            root.find(".image-box").append(`<div class="movement-icon" id="down-left-image" ><div>DL</div><img src="${downLeftImage}" title="${game.i18n.format("8BITMOVEMENT.down-left")}"></div>`);
            root.find("#down-left-image").click(async function(){
                await imageLoader(token.id, sheet, "DL");
            });
            root.find(".image-box").append(`<div class="movement-icon" id="down-right-image" ><div>DR</div><img src="${downRightImage}" title="${game.i18n.format("8BITMOVEMENT.down-right")}"></div>`);
            root.find("#down-right-image").click(async function(){
                await imageLoader(token.id, sheet, "DR");
            });
        }


        if(token.document.getFlag(MODULE_NAME, "set")){
            root.find(".image-box").append(`<div class="movement-icon option" id="remove-from-prototype" ><i class="fas fa-times" title="${game.i18n.format("8BITMOVEMENT.delete")}"></i></div>`);
            root.find("#remove-from-prototype").click(async function(){
                await game.actors.get(token.actor.id).update({"prototypeToken.flags.-=8bit-movement": null, "prototypeToken.texture.src": downImage, "prototypeToken.lockRotation": false});
                await token.document.update({"flags.-=8bit-movement": null, "texture.src": downImage, lockRotation: false, rotation: 0});
                sheet.render();
            });
        }
        else {
            root.find(".image-box").append(`<div class="movement-icon option" id="save-to-prototype" ><i class="fas fa-address-card" title="${game.i18n.format("8BITMOVEMENT.save")}"></i></div>`);
            root.find("#save-to-prototype").click(async function(){
                await game.actors.get(token.actor.id).update({"prototypeToken.flags.8bit-movement": {up: upImage, down: downImage, left: leftImage, right: rightImage, set: true}, "prototypeToken.texture.src": downImage, "prototypeToken.lockRotation": true});
                await token.document.setFlag(MODULE_NAME, "set", true);
                sheet.render();
            });
        }
    }   
}
/**
 * Makes the buttons on the Token Config window.
 * @param {object} sheet | recieves the sheet from the renderTokenConfig hook. 
 */
export async function createConfigButtons(sheet, element) {
    if(!game.settings.get(MODULE_NAME, "settingsMode")) return;
    if(game.settings.get(MODULE_NAME, "gmMode") && !game.user.isGM) return;

    const root = getHtmlElement(sheet, element);
    const token = sheet.document ?? sheet.object;

    console.log("8bit-movement TokenConfig sheet", sheet);
    console.log("8bit-movement TokenConfig token", token);

    if(!root || !token || token.documentName !== "Token") return;

    const appearanceTab =
      root.querySelector('.tab[data-tab="appearance"]') ??
      root.querySelector('[data-tab="appearance"]');

    console.log("8bit-movement TokenConfig root", root);
    console.log("8bit-movement TokenConfig appearanceTab", appearanceTab);

    if(!appearanceTab || appearanceTab.querySelector(".movement-form-group")) return;

    const fallbackImage = token.texture?.src ?? token.actor?.img ?? "";
    const images = {
      up: token.getFlag(MODULE_NAME, "up") || fallbackImage,
      down: token.getFlag(MODULE_NAME, "down") || fallbackImage,
      left: token.getFlag(MODULE_NAME, "left") || fallbackImage,
      right: token.getFlag(MODULE_NAME, "right") || fallbackImage,
      UL: token.getFlag(MODULE_NAME, "UL") || fallbackImage,
      UR: token.getFlag(MODULE_NAME, "UR") || fallbackImage,
      DL: token.getFlag(MODULE_NAME, "DL") || fallbackImage,
      DR: token.getFlag(MODULE_NAME, "DR") || fallbackImage
    };

    const createSection = (labelText) => {
      const group = document.createElement("div");
      group.className = "form-group movement-form-group";

      const fieldset = document.createElement("fieldset");
      fieldset.className = "movement-fieldset";

      const legend = document.createElement("legend");
      legend.className = "movement-legend";
      legend.textContent = labelText;

      const fields = document.createElement("div");
      fields.className = "form-fields movement-fields";

      fieldset.append(legend, fields);
      group.append(fieldset);
      appearanceTab.append(group);
      return fields;
    };

    const createActionButton = (className, title, innerHtml, onClick) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `movement-settings ${className}`;
      button.title = title;
      button.setAttribute("aria-label", title);
      button.innerHTML = innerHtml;
      button.addEventListener("click", onClick);
      return button;
    };

    const createImageButton = (className, title, src, direction) => createActionButton(
      className,
      title,
      `<img src="${src}" alt="${title}">`,
      async () => {
        await imageLoader(token.id, sheet, direction);
      }
    );

    if(!token.flags.hasOwnProperty(MODULE_NAME)) {
      const fields = createSection(game.i18n.format("8BITMOVEMENT.activate_label"));
      fields.append(createActionButton(
        "activate",
        game.i18n.format("8BITMOVEMENT.activate"),
        `<i class="far fa-plus-square"></i>`,
        async () => {
          await initializeMovement(token.id);
          sheet.render();
        }
      ));

      if (typeof sheet.setPosition === "function") sheet.setPosition();
      return;
    }

    if(token.getFlag(MODULE_NAME, "locked")) {
      const fields = createSection(`${game.i18n.format("8BITMOVEMENT.unlock")}:`);
      fields.append(createActionButton(
        "unlock",
        game.i18n.format("8BITMOVEMENT.unlock"),
        `<i class="fas fa-lock"></i>`,
        async () => {
          await token.setFlag(MODULE_NAME, "locked", false);
          sheet.render();
        }
      ));

      if (typeof sheet.setPosition === "function") sheet.setPosition();
      return;
    }

    const fields = createSection(game.i18n.format("8BITMOVEMENT.settings"));
    fields.append(createActionButton(
      "lock",
      game.i18n.format("8BITMOVEMENT.lock"),
      `<i class="fas fa-lock-open"></i>`,
      async () => {
        await token.setFlag(MODULE_NAME, "locked", true);
        sheet.render();
      }
    ));

    fields.append(createImageButton("up-image", game.i18n.format("8BITMOVEMENT.up"), images.up, "up"));
    fields.append(createImageButton("down-image", game.i18n.format("8BITMOVEMENT.down"), images.down, "down"));
    fields.append(createImageButton("left-image", game.i18n.format("8BITMOVEMENT.left"), images.left, "left"));
    fields.append(createImageButton("right-image", game.i18n.format("8BITMOVEMENT.right"), images.right, "right"));

    if (game.settings.get(MODULE_NAME, "diagonalMode")) {
      fields.append(createImageButton("up-left-image", game.i18n.format("8BITMOVEMENT.up-left"), images.UL, "UL"));
      fields.append(createImageButton("up-right-image", game.i18n.format("8BITMOVEMENT.up-right"), images.UR, "UR"));
      fields.append(createImageButton("down-left-image", game.i18n.format("8BITMOVEMENT.down-left"), images.DL, "DL"));
      fields.append(createImageButton("down-right-image", game.i18n.format("8BITMOVEMENT.down-right"), images.DR, "DR"));
    }

    if(token.getFlag(MODULE_NAME, "set")) {
      fields.append(createActionButton(
        "remove",
        game.i18n.format("8BITMOVEMENT.delete"),
        `<i class="fas fa-times"></i>`,
        async () => {
          await game.actors.get(token.actor.id).update({
            "prototypeToken.flags.-=8bit-movement": null,
            "prototypeToken.texture.src": images.down,
            "prototypeToken.lockRotation": false
          });
          await token.update({
            "flags.-=8bit-movement": null,
            "texture.src": images.down,
            lockRotation: false,
            rotation: 0
          });
          sheet.render();
        }
      ));
    } else {
      fields.append(createActionButton(
        "save",
        game.i18n.format("8BITMOVEMENT.save"),
        `<i class="fas fa-address-card"></i>`,
        async () => {
          await game.actors.get(token.actor.id).update({
            "prototypeToken.flags.8bit-movement": {up: images.up, down: images.down, left: images.left, right: images.right, set: true},
            "prototypeToken.texture.src": images.down,
            "prototypeToken.lockRotation": true
          });
          await token.setFlag(MODULE_NAME, "set", true);
          sheet.render();
        }
      ));
    }

    if (typeof sheet.setPosition === "function") sheet.setPosition();
}

// Ensure no lingering fade/opacity after animated movement completes

// Post-update: do the direction swap AFTER the move has begun, to keep movement smooth.
Hooks.on("updateToken", async (doc, changes, options, userId) => {
  try {
    const token = canvas?.tokens?.get(doc.id);
    if (!token) return;

    // Transient flag from preUpdateToken
    const next = (changes?.flags && changes.flags["8bit-movement"] && changes.flags["8bit-movement"].__nextTexture)
                 || doc.getFlag("8bit-movement", "__nextTexture");

    // Debounce persistence until movement fully settles (prevents teleport on drawn paths)
    if (next || ("x" in changes) || ("y" in changes)) {
      const prev = __8bitPersistTimers.get(doc.id);
      if (prev) clearTimeout(prev);
      const handle = setTimeout(async () => {
        try {
          const pending = doc.getFlag("8bit-movement", "__nextTexture");
          if (pending) {
            await doc.update({ "texture.src": pending, "flags.8bit-movement.-=__nextTexture": null }, { animate: false });
          }
          const tk = canvas?.tokens?.get(doc.id);
          if (tk) {
            const kicks = [0, 48, 120, 240];
            for (const t of kicks) setTimeout(() => __8bit_forceOpaque(tk), t);
          }
        } catch (_e) {}
        __8bitPersistTimers.delete(doc.id);
      }, 800);
      __8bitPersistTimers.set(doc.id, handle);
    }

    // Also keep opacity solid during any movement frame
    const movedNow = ("x" in changes) || ("y" in changes);
    const swapped = !!next || (changes?.texture && ("src" in changes.texture));
    if (movedNow || swapped) {
      const kicks = [0, 48, 120, 240];
      for (const t of kicks) setTimeout(() => __8bit_forceOpaque(token), t);
    }
  } catch (e) {
    console.warn("8bit-movement: post-update handler failed", e);
  }
});
