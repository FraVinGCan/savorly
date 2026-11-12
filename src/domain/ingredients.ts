export const CATEGORY_ORDER = [
  'produce',
  'protein',
  'dairy',
  'pantry',
  'spice',
  'other',
] as const

export type IngredientCategory = (typeof CATEGORY_ORDER)[number]

export const CATEGORY_META: Record<
  IngredientCategory,
  { label: string; glyph: string }
> = {
  produce: { label: 'Fruit & veg', glyph: '🥬' },
  protein: { label: 'Meat, fish & protein', glyph: '🍗' },
  dairy: { label: 'Dairy & eggs', glyph: '🧀' },
  pantry: { label: 'Pantry', glyph: '🥫' },
  spice: { label: 'Herbs & spices', glyph: '🌿' },
  other: { label: 'Other', glyph: '🧺' },
}

const noise = new Set(
  `fresh ripe ground toasted finely roughly chopped sliced diced minced crushed
   small large medium extra virgin pure all-purpose boneless skinless trimmed
   cut pieces piece thin thick halved quartered grated peeled seeded
   white red green black yellow orange purple dried organic packed
   leaves leaf spears spear cloves clove seeds seed sprigs sprig stalks stalk
   to taste of the and with a an for`.split(/\s+/),
)

const units = new Set(
  `cup cups tbsp tablespoon tablespoons tsp teaspoon teaspoons g kg gram grams
   oz ounce ounces lb lbs ml l liter litre liters litres can cans tin tins
   handful handfuls pinch pinches dash dashes bunch bunches slice slices
   package packages pkg clove cloves`.split(/\s+/),
)

const leadingQuantities = new Set([
  'half',
  'quarter',
  'third',
  'dozen',
  'pair',
  'few',
  'several',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'a',
  'an',
])

const plural: Record<string, string> = {
  berries: 'berry',
  chillies: 'chili',
  chilies: 'chili',
  potatoes: 'potato',
  tomatoes: 'tomato',
  onions: 'onion',
  leaves: 'leaf',
  knives: 'knife',
  loaves: 'loaf',
  halves: 'half',
  shelves: 'shelf',
  strawberries: 'strawberry',
  blueberries: 'blueberry',
  raspberries: 'raspberry',
  blackberries: 'blackberry',
}

function stem(word: string): string {
  if (plural[word]) return plural[word]
  if (word.length <= 3 || /(?:ss|us|is|os|as)$/.test(word)) return word
  if (/(?:ches|shes|xes|zes)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('ies')) {
    const root = word.slice(0, -3)
    return /([b-df-hj-np-tv-z])\1$/.test(root) ? `${root}y` : word.slice(0, -1)
  }
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function cleanedHead(raw: string): string[] {
  const folded = raw
    .replace(
      /[½¼¾⅓⅔]/g,
      (fraction) =>
        ({
          '½': ' half ',
          '¼': ' quarter ',
          '¾': ' three quarters ',
          '⅓': ' third ',
          '⅔': ' two thirds ',
        })[fraction] ?? ' ',
    )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const head = (folded.split('(')[0] ?? '').split(',')[0] ?? ''
  return head
    .replace(/[^a-z0-9./\s-]/g, ' ')
    .replace(/-/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function normalizeIngredient(raw: string): string {
  const cleaned = cleanedHead(raw)
  const tokens = cleaned.slice()
  while (tokens.length) {
    const token = tokens[0]!
    const fraction = /^\d+\/\d+$/.test(token)
    const quantity = /^\d+(?:\.\d+)?(?:g|kg|ml|oz|lb|lbs)?$/.test(token)
    if (
      fraction ||
      quantity ||
      units.has(token) ||
      leadingQuantities.has(token)
    ) {
      tokens.shift()
      continue
    }
    break
  }
  const meaningful = tokens
    .filter(
      (token) => !noise.has(token) && !units.has(token) && !/^\d/.test(token),
    )
    .map(stem)
  return (
    meaningful.join(' ') ||
    cleaned.map(stem).join(' ') ||
    raw.trim().toLowerCase()
  )
}

export function matchKeys(raw: string): string[] {
  const key = normalizeIngredient(raw)
  return [
    ...new Set([key, ...key.split(/\s+/).filter((token) => token.length > 2)]),
  ]
}

const lists: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  dairy: [
    'milk',
    'cheese',
    'butter',
    'cream',
    'yogurt',
    'yoghurt',
    'mozzarella',
    'parmesan',
    'cheddar',
    'egg',
  ],
  protein: [
    'chicken',
    'beef',
    'pork',
    'lamb',
    'turkey',
    'fish',
    'salmon',
    'shrimp',
    'prawn',
    'tofu',
    'tempeh',
    'bacon',
    'meat',
    'sausage',
  ],
  spice: [
    'pepper',
    'paprika',
    'cumin',
    'coriander',
    'cinnamon',
    'chili',
    'chilli',
    'cayenne',
    'oregano',
    'thyme',
    'basil',
    'ginger',
    'garlic',
    'masala',
    'turmeric',
  ],
  pantry: [
    'oil',
    'flour',
    'sugar',
    'sauce',
    'rice',
    'pasta',
    'noodle',
    'vinegar',
    'stock',
    'broth',
    'bread',
    'honey',
    'salt',
    'starch',
    'cornmeal',
    'batter',
    'syrup',
  ],
  produce: [
    'apple',
    'banana',
    'tomato',
    'potato',
    'onion',
    'carrot',
    'asparagus',
    'spinach',
    'lettuce',
    'lemon',
    'lime',
    'cabbage',
    'broccoli',
    'corn',
    'mushroom',
    'eggplant',
    'pepper',
    'avocado',
    'bean',
    'pea',
    'berry',
  ],
}

const has = (key: string, word: string) => new RegExp(`\\b${word}\\b`).test(key)

export function classifyIngredient(raw: string): IngredientCategory {
  const key = normalizeIngredient(raw)
  if (!key) return 'other'
  if (/\b(?:oat|almond|soy|coconut|rice) milk\b/.test(key)) return 'pantry'
  for (const category of [
    'dairy',
    'protein',
    'spice',
    'pantry',
    'produce',
  ] as const) {
    if (lists[category].some((word) => has(key, word))) return category
  }
  return 'pantry'
}

export const displayIngredient = (key: string) =>
  key ? key[0]!.toUpperCase() + key.slice(1) : 'Ingredient'

const swatches = [
  ['#e9f0df', '#49633d'],
  ['#f7e7d7', '#9e5b32'],
  ['#e1eee9', '#416e5d'],
  ['#f4e9c9', '#8c7023'],
  ['#e9e5f3', '#685b86'],
  ['#f4e2e5', '#9b5360'],
  ['#e5edf6', '#426180'],
  ['#efe7dc', '#775d3c'],
]

export function swatchFor(seed: string): {
  background: string
  foreground: string
} {
  let hash = 31
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  const pair = swatches[Math.abs(hash) % swatches.length]!
  return { background: pair[0], foreground: pair[1] }
}

export const PANTRY_SUGGESTIONS = [
  'olive oil',
  'salt',
  'black pepper',
  'garlic',
  'onion',
  'rice',
  'pasta',
  'flour',
  'sugar',
  'eggs',
  'butter',
  'milk',
  'tomato',
  'potato',
  'lemon',
  'soy sauce',
  'vinegar',
  'honey',
  'beans',
  'canned tomatoes',
  'chicken stock',
  'bread',
  'oats',
  'cheese',
  'carrot',
  'ginger',
  'cumin',
  'paprika',
  'cinnamon',
  'chili flakes',
  'coconut milk',
  'lentils',
  'noodles',
  'cornstarch',
  'baking powder',
  'balsamic vinegar',
  'sesame oil',
  'peanut butter',
  'chickpeas',
  'frozen peas',
] as const
