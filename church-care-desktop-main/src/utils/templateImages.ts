import page1 from '../assets/templates/page1.webp';
import page2 from '../assets/templates/page2.webp';
import page3 from '../assets/templates/page3.webp';
import page4 from '../assets/templates/page4.webp';
import page5 from '../assets/templates/page5.webp';
import page6 from '../assets/templates/page6.webp';

export const TEMPLATE_IMAGES: Record<number, string> = {
  1: page1,
  2: page2,
  3: page3,
  4: page4,
  5: page5,
  6: page6,
};

export function getTemplatePageImage(page: number): string {
  return TEMPLATE_IMAGES[page] || page1;
}
