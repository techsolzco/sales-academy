export const FAQ_CATEGORIES = [
  'Pricing', 'Product', 'Warranty', 'General', 'Technical',
  'Comparison', 'Payment', 'Privacy', 'Delivery', 'Features',
  'Policy', 'Usage', 'Support', 'Audience', 'Guideline'
] as const;

export type FaqCategory = typeof FAQ_CATEGORIES[number];
