// One colour per portfolio category, shared by the profile, the project index and case pages.
export const categoryTone: Record<string, string> = {
  'AI 产品': 'green',
  '云平台': 'blue',
  'SDK 与交付': 'orange',
  '商业系统': 'violet',
  '网站设计': 'pink',
  '公司基础设施': 'teal',
};

export const toneOf = (category: string) => categoryTone[category] || 'green';
