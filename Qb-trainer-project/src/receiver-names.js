const STORAGE_KEY = 'pocket-lab.receiver-names.v1';

export function normalizeReceiverName(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function validReceiverNames(names, count = 5) {
  return Array.isArray(names) && names.length === count &&
    names.every(name => typeof name === 'string' && /^[A-Z0-9]{1,3}$/.test(name)) &&
    new Set(names).size === count;
}

export function loadReceiverNames(defaults, storage) {
  try {
    const names = JSON.parse((storage ?? globalThis.localStorage).getItem(STORAGE_KEY));
    return validReceiverNames(names, defaults.length) ? names : [...defaults];
  } catch {
    return [...defaults];
  }
}

export function saveReceiverNames(names, storage) {
  if (!validReceiverNames(names)) return false;
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(names));
    return true;
  } catch {
    return false;
  }
}

export function setupReceiverNames({ names, defaults, onChange }) {
  const inputs = [...document.querySelectorAll('.receiver-name')];
  const feedback = document.getElementById('receiver-name-feedback');
  function refresh() {
    inputs.forEach((input, index) => {
      input.value = names[index];
      document.getElementById(`route-${index}`).setAttribute('aria-label', `${names[index]} receiver route`);
    });
    onChange();
  }
  function persist() {
    const saved = saveReceiverNames(names);
    feedback.textContent = saved ? 'Team designations saved on this device.' : 'Names updated for this session; device storage is unavailable.';
    refresh();
  }
  inputs.forEach((input, index) => {
    input.addEventListener('change', () => {
      const name = normalizeReceiverName(input.value);
      const candidate = names.map((current, i) => i === index ? name : current);
      if (!validReceiverNames(candidate)) {
        feedback.textContent = 'Use a unique designation of 1–3 letters or numbers for each receiver.';
        input.value = names[index];
        return;
      }
      names[index] = name;
      persist();
    });
  });
  const reset = document.getElementById('reset-names');
  reset.addEventListener('click', () => {
    names.splice(0, names.length, ...defaults);
    persist();
  });
  refresh();
  return {
    setLocked(locked) {
      inputs.forEach(input => { input.disabled = locked; });
      reset.disabled = locked;
    },
  };
}
