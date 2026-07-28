import { guideTelegram } from './pillars/guide-telegram';
import { guideInstagram } from './pillars/guide-instagram';
import { smmApiGuide } from './pillars/smm-api-guide';
import { howToChooseSmmPanel } from './pillars/how-to-choose-smm-panel';
import { guideVk } from './pillars/guide-vk';
import { glossaryTerms, GlossaryTerm } from './glossary';

export interface PillarPage {
  slug: string;
  title: string;
  metaTitle: string;
  excerpt: string;
  contentHtml: string;
  faq: Array<{ question: string; answer: string }>;
  readTimeMinutes: number;
  network: string;
  category: string;
}

export const pillarPages: PillarPage[] = [
  guideTelegram,
  guideInstagram,
  smmApiGuide,
  howToChooseSmmPanel,
  guideVk,
];

export {
  guideTelegram,
  guideInstagram,
  smmApiGuide,
  howToChooseSmmPanel,
  guideVk,
  glossaryTerms,
};

export type { GlossaryTerm };
