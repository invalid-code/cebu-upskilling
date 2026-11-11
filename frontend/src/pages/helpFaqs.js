import { WifiOff, ShieldCheck, MessageCircleQuestion } from 'lucide-react';

export const FAQS = [
  {
    id: 'connection',
    icon: WifiOff,
    question: 'Connection dropped?',
    answer: 'Your low-risk progress saves locally and syncs when you reconnect.',
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    question: 'Assessment privacy',
    answer: 'Proctoring permissions are requested before the timer starts, never silently.',
  },
  {
    id: 'support',
    icon: MessageCircleQuestion,
    question: 'Still need help?',
    answer: 'Tell us what blocked you and we will point to the next action.',
    hasButton: true,
  },
];

/**
 * Entries whose question or answer contains `query` as a case-insensitive substring.
 * An empty query returns every entry.
 */
export function filterFaqs(faqs, query) {
  if (!query) return faqs;
  const needle = String(query).toLowerCase();
  return faqs.filter(
    (faq) => faq.question.toLowerCase().includes(needle) || faq.answer.toLowerCase().includes(needle),
  );
}
