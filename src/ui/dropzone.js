// Drag-drop + file picker for the landing zone.

export function initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles }) {
  function emitFiles(fileList) {
    const files = [...fileList].filter((f) => /^image\//.test(f.type));
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

  inputEl.addEventListener('change', () => {
    if (inputEl.files?.length) emitFiles(inputEl.files);
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
