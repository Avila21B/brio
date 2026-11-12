// Calorías: metabolismo basal, meta sugerida y totales del día.
import { dayKey, sum } from '../util.js';

export function bmr(p) {
  if (!p) return 1800;
  const age = new Date().getFullYear() - (p.birthYear || 1995);
  const sexAdj = p.sex === 'm' ? 5 : p.sex === 'f' ? -161 : -78;
  return 10 * (p.weightKg || 70) + 6.25 * (p.heightCm || 168) - 5 * age + sexAdj;
}

export const tdee = (p) => Math.round(bmr(p) * 1.4);

export const suggestedGoal = (p, deficit = 500) =>
  Math.max(1200, Math.round((tdee(p) - deficit) / 10) * 10);

export const bmi = (p) => (p?.heightCm && p?.weightKg ? p.weightKg / (p.heightCm / 100) ** 2 : null);

export function dayNutrition(state, date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date);
  const logs = state.foodLogs.filter((l) => l.date === key);
  const burned = Math.round(sum(state.workouts.filter((w) => dayKey(w.startAt) === key), (w) => w.kcal));
  const eaten = Math.round(sum(logs, (l) => l.kcal));
  const goal = state.profile?.calorieGoal || 2000;
  return {
    key,
    logs,
    eaten,
    burned,
    goal,
    remaining: goal - eaten + burned,
    protein: Math.round(sum(logs, (l) => l.protein)),
    carbs: Math.round(sum(logs, (l) => l.carbs)),
    fat: Math.round(sum(logs, (l) => l.fat)),
    water: state.water[key] || 0,
    waterGoal: state.profile?.waterGoalMl || 2000,
  };
}

export const FAST_PROTOCOLS = [
  [12, '12:12', 'Suave para empezar'],
  [14, '14:10', 'Intermedio'],
  [16, '16:8', 'El más popular'],
  [18, '18:6', 'Avanzado'],
  [20, '20:4', 'Ventana corta'],
  [24, '24 h', 'Un día completo'],
];

export const FAST_STAGES = [
  [0, 'Digestión', 'Tu cuerpo aún procesa la última comida.'],
  [4, 'Azúcar estable', 'La glucosa empieza a bajar.'],
  [12, 'Quema de grasa', 'Empiezas a usar reservas de grasa.'],
  [16, 'Cetosis ligera', 'Más energía viene de la grasa.'],
  [18, 'Renovación', 'Fase avanzada del ayuno.'],
];
