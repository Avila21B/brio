// Cartas coleccionables propias. [id, serie, nombre, emoji, rareza]
export const SERIES = [
  ['huerto', 'Huerto', 'Verduras con actitud'],
  ['cosmos', 'Cosmos', 'Del barrio a las estrellas'],
  ['oceano', 'Océano', 'Criaturas del fondo marino'],
  ['andes', 'Andes', 'Tesoros de la montaña'],
];

const RAW = [
  ['h1', 'huerto', 'Zanahoria velocista', '🥕', 'comun'],
  ['h2', 'huerto', 'Brócoli zen', '🥦', 'comun'],
  ['h3', 'huerto', 'Tomate saltarín', '🍅', 'comun'],
  ['h4', 'huerto', 'Berenjena ninja', '🍆', 'comun'],
  ['h5', 'huerto', 'Maíz dorado', '🌽', 'rara'],
  ['h6', 'huerto', 'Ají picante', '🌶️', 'rara'],
  ['h7', 'huerto', 'Palta legendaria', '🥑', 'epica'],
  ['h8', 'huerto', 'Calabaza reina', '🎃', 'legendaria'],
  ['c1', 'cosmos', 'Luna creciente', '🌙', 'comun'],
  ['c2', 'cosmos', 'Estrella fugaz', '🌠', 'comun'],
  ['c3', 'cosmos', 'Cometa', '☄️', 'comun'],
  ['c4', 'cosmos', 'Satélite', '🛰️', 'comun'],
  ['c5', 'cosmos', 'Cohete', '🚀', 'rara'],
  ['c6', 'cosmos', 'Saturno', '🪐', 'rara'],
  ['c7', 'cosmos', 'Galaxia', '🌌', 'epica'],
  ['c8', 'cosmos', 'Sol eterno', '☀️', 'legendaria'],
  ['o1', 'oceano', 'Pez payaso', '🐠', 'comun'],
  ['o2', 'oceano', 'Cangrejo', '🦀', 'comun'],
  ['o3', 'oceano', 'Caracola', '🐚', 'comun'],
  ['o4', 'oceano', 'Pulpo', '🐙', 'comun'],
  ['o5', 'oceano', 'Tortuga', '🐢', 'rara'],
  ['o6', 'oceano', 'Delfín', '🐬', 'rara'],
  ['o7', 'oceano', 'Ballena', '🐋', 'epica'],
  ['o8', 'oceano', 'Tiburón ancestral', '🦈', 'legendaria'],
  ['a1', 'andes', 'Cactus', '🌵', 'comun'],
  ['a2', 'andes', 'Piedra sabia', '🪨', 'comun'],
  ['a3', 'andes', 'Flor de altura', '🌸', 'comun'],
  ['a4', 'andes', 'Cascada', '💦', 'comun'],
  ['a5', 'andes', 'Cóndor', '🦅', 'rara'],
  ['a6', 'andes', 'Volcán', '🌋', 'rara'],
  ['a7', 'andes', 'Nevado', '🏔️', 'epica'],
  ['a8', 'andes', 'Arcoíris', '🌈', 'legendaria'],
];

export const RARITY = {
  comun: { label: 'Común', weight: 60 },
  rara: { label: 'Rara', weight: 28 },
  epica: { label: 'Épica', weight: 10 },
  legendaria: { label: 'Legendaria', weight: 2 },
};

export const CARDS = RAW.map(([id, series, name, icon, rarity]) => ({ id, series, name, icon, rarity }));
const BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const card = (id) => BY_ID[id];
