import { isVideoSource } from "../directional-images.js";

export function createMediaPreview(src, title) {
  if (isVideoSource(src)) {
    const video = document.createElement("video");
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", title);
    return video;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = title;
  return image;
}

export function createFormGroup(fieldset, labelText, inputId) {
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
}

export function createActionButton({
  className,
  title,
  iconClass,
  text,
  onClick,
  type = "button",
  buttonClass = "movement-settings movement-action-button",
}) {
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
}

export function createCheckboxGroup(
  fieldset,
  labelText,
  inputId,
  checked,
  onChange,
) {
  const fields = createFormGroup(fieldset, labelText, inputId);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = inputId;
  input.checked = checked;
  input.addEventListener("change", onChange);
  fields.append(input);
  return input;
}

export function createSelectGroup(
  fieldset,
  labelText,
  inputId,
  value,
  choices,
  onChange,
) {
  const fields = createFormGroup(fieldset, labelText, inputId);
  const select = document.createElement("select");
  select.id = inputId;
  for (const [choiceValue, choiceLabel] of Object.entries(choices)) {
    const option = document.createElement("option");
    option.value = choiceValue;
    option.textContent = choiceLabel;
    option.selected = choiceValue === value;
    select.append(option);
  }
  select.addEventListener("change", onChange);
  fields.append(select);
  return select;
}

export function createNumberGroup(
  fieldset,
  labelText,
  inputId,
  value,
  { min, max, step },
  onChange,
) {
  const fields = createFormGroup(fieldset, labelText, inputId);
  const input = document.createElement("input");
  input.type = "number";
  input.id = inputId;
  input.value = String(value);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  if (step !== undefined) input.step = String(step);
  input.addEventListener("change", onChange);
  fields.append(input);
  return input;
}

export function createImagePickerField({
  id,
  title,
  src,
  onSelect,
  pickerType = "imagevideo",
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "movement-image-field";
  const inputId = `${id}-path`;

  const picker = document.createElement("file-picker");
  picker.setAttribute("type", pickerType);
  picker.setAttribute("value", src);
  picker.id = inputId;

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.id = id;
  previewButton.className = "movement-settings movement-preview-button";
  previewButton.title = title;
  previewButton.setAttribute("aria-label", title);

  let previewMedia = createMediaPreview(src, title);
  previewButton.append(previewMedia);
  previewButton.addEventListener("click", () => picker.button?.click());
  picker.addEventListener("change", async (event) => {
    const selectedPath = String(event.currentTarget.value ?? "").trim();
    if (!selectedPath) return;
    const nextPreview = createMediaPreview(selectedPath, title);
    previewMedia.replaceWith(nextPreview);
    previewMedia = nextPreview;
    await onSelect(selectedPath);
  });

  wrapper.append(picker, previewButton);
  return wrapper;
}
