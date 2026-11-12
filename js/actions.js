// Mutaciones compartidas entre pantallas.
import { update } from './store.js';
import { uid, dayKey } from './util.js';

export function addWater(ml, key = dayKey()) {
  update((s) => { s.water[key] = Math.max(0, (s.water[key] || 0) + ml); });
}

export function saveWorkout(w) {
  const id = w.id || uid();
  update((s) => {
    const item = { tagIds: [], note: '', source: 'manual', ...w, id };
    const i = s.workouts.findIndex((x) => x.id === id);
    if (i >= 0) s.workouts[i] = item;
    else s.workouts.push(item);
    s.workouts.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  });
  return id;
}

export function deleteWorkout(id) {
  update((s) => { s.workouts = s.workouts.filter((w) => w.id !== id); });
}

export function addFood(log) {
  update((s) => { s.foodLogs.push({ id: uid(), ...log }); });
}

export function deleteFood(id) {
  update((s) => { s.foodLogs = s.foodLogs.filter((l) => l.id !== id); });
}
