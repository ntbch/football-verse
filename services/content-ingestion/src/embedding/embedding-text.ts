import { NormalizedItem } from '../contracts/normalized-item';

export function buildClusteringText(item: NormalizedItem): string {
  const title = (item.title || '').trim();
  const summary = (item.description || '').trim().slice(0, 1800);
  const publisher = item.provider || '';
  const language = item.language || 'en';

  return [
    'query:',
    `title: ${title}`,
    `summary: ${summary}`,
    `publisher: ${publisher}`,
    `language: ${language}`
  ].join('\n');
}
