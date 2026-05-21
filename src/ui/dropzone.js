// Drag-drop + file picker for the landing zone.

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i;

// iOS Safari often hands photos from the library to the browser with an
// empty or non-standard MIME type, so fall back to the file extension.
function isImageFile(f) {
  return /^image\//i.test(f.type) || IMAGE_EXT.test(f.name || '');
}

export function initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles }) {
  function emitFiles(fileList) {
    const files = [...fileList].filter(isImageFile);
    if (files.length) onFiles(files);
  }

  chooseBtn.addEventListener('click', () => inputEl.click());
  dropzoneEl.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    inputEl.click();
  });
  dropzoneEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputEl.click();
    }
  });

  // The file input already constrains selection via accept="image/*", so
  // trust it directly — iOS reports unreliable MIME types for picked photos,
  // and the type filter below would silently drop otherwise-valid images.
  inputEl.addEventListener('change', () => {
    if (inputEl.files?.length) onFiles([...inputEl.files]);
    inputEl.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzoneEl.classList.add('dropzone-active');
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    dropzoneEl.addEventListener(evt, () => {
      dropzoneEl.classList.remove('dropzone-active');
    });
  });
  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) emitFiles(e.dataTransfer.files);
  });

  // Drag-onto-page support — accept drops anywhere.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    if (!dropzoneEl.contains(e.target)) {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) emitFiles(e.dataTransfer.files);
    }
  });
}
