const MAX_BYTES = 256_000;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const keysWithin = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key));
const commands = (value, count) => Array.isArray(value) && value.length === count && value.every(command => integer(command, 0, 6));

function boardValid(board) {
  if (!keysWithin(board, ['version', 'budget', 'rules', 'cells', 'cats']) || board.version !== 1 || !finite(board.budget) || board.budget < 0 || board.budget > 10000) return false;
  if (!Array.isArray(board.cells) || board.cells.length !== 35 || !Array.isArray(board.cats) || board.cats.length !== 3) return false;
  if (!board.cells.every(cell => {
    if (!keysWithin(cell, ['type', 'floors', 'existing', 'confidence'])) return false;
    if (!['empty', 'low', 'high', 'plant', 'mud', 'spikes', 'rock', 'wall'].includes(cell.type) || !commands(cell.existing, 2)) return false;
    const floors = ['low', 'high'].includes(cell.type) ? 2 : cell.type === 'plant' ? 1 : 0;
    return cell.floors === floors && (cell.confidence === undefined || (typeof cell.confidence === 'string' && cell.confidence.length < 40));
  })) return false;
  if (!board.cats.every((cat, index) => keysWithin(cat, ['color', 'start', 'bed', 'direction']) && cat.color === ['Blue', 'Red', 'Green'][index] && integer(cat.start, 0, 34) && integer(cat.bed, 0, 34) && integer(cat.direction, 1, 4))) return false;
  if (!keysWithin(board.rules, ['turns', 'startingPower', 'powerUpBonus', 'firstBedBonus', 'secondBedMultiplier', 'thirdBedMultiplier', 'bounceMoves', 'forbidFights', 'conservative'])) return false;
  return board.rules.turns === 15 && Object.entries(board.rules).every(([key, value]) => ['bounceMoves', 'forbidFights', 'conservative'].includes(key) ? typeof value === 'boolean' : finite(value));
}

/** Accept only a bounded JSON export from this exact planner frame, never arbitrary URLs or filenames. */
export function validatePlannerDownload(event, expectedOrigin, frameSource) {
  if (!frameSource || event.source !== frameSource || event.origin !== expectedOrigin) return null;
  const message = event.data;
  if (!keysWithin(message, ['type', 'requestId', 'filename', 'json']) || message.type !== 'kaiju:download') return null;
  if (!['kaiju-board.json', 'kaiju-plan.json'].includes(message.filename) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(message.requestId || '')) return null;
  if (typeof message.json !== 'string' || message.json.length > MAX_BYTES || new TextEncoder().encode(message.json).length > MAX_BYTES) return null;
  let data;
  try {
    data = JSON.parse(message.json, (key, value) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('Invalid JSON property');
      return value;
    });
  } catch { return null; }
  if (message.filename === 'kaiju-board.json') {
    if (!boardValid(data)) return null;
  } else {
    if (!keysWithin(data, ['board', 'plan', 'placements', 'result', 'instructions']) || !boardValid(data.board) || !commands(data.plan, 70)) return null;
    if (!Array.isArray(data.placements) || data.placements.length > 70 || typeof data.instructions !== 'string' || data.instructions.length > 16000) return null;
    if (!plain(data.result) || data.result.valid !== true || !finite(data.result.score) || data.result.score < 0 || !integer(data.result.finished, 0, 3)) return null;
    if (!Array.isArray(data.result.snapshots) || data.result.snapshots.length < 1 || data.result.snapshots.length > 16 || !data.result.snapshots.every(snapshot => plain(snapshot) && integer(snapshot.turn, 0, 15) && Array.isArray(snapshot.cats) && snapshot.cats.length === 3)) return null;
  }
  return { requestId: message.requestId, filename: message.filename, json: JSON.stringify(data, null, 2) };
}

export function startPlannerDownload(download, documentImpl = document, urlImpl = URL) {
  const url = urlImpl.createObjectURL(new Blob([download.json], { type: 'application/json' }));
  const anchor = documentImpl.createElement('a');
  anchor.href = url;
  anchor.download = download.filename;
  anchor.hidden = true;
  documentImpl.body.append(anchor);
  try { anchor.click(); } finally { anchor.remove(); }
  return url;
}
