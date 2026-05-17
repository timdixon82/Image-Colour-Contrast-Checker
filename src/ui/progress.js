// Queue-row progress: per-image state badges driven by worker messages.

const STAGE_LABEL = {
  queued:    'Queued',
  decoding:  'Decoding',
  ocr:       'OCR',
  analysing: 'Analysing',
  done:      'Done',
  failed:    'Failed'
};

export function createQueueRow(filename) {
  const li = document.createElement('li');
  li.className = 'queue-row';
  li.dataset.stage = 'queued';

  const name = document.createElement('span');
  name.className = 'queue-name';
  name.textContent = filename;

  const stage = document.createElement('span');
  stage.className = 'queue-stage';
  stage.textContent = STAGE_LABEL.queued;

  li.append(name, stage);
  return li;
}

export function setRowStage(row, stage, extra) {
  if (!row) return;
  row.dataset.stage = stage;
  const stageEl = row.querySelector('.queue-stage');
  stageEl.textContent = STAGE_LABEL[stage] ?? stage;
  if (extra) stageEl.title = extra;
}
