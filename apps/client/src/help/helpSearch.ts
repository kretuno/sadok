export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  content: string;
}

const normalize = (value: string): string => value.toLocaleLowerCase('uk-UA').replace(/\s+/g, ' ').trim();

const matchesTerm = (text: string, term: string): boolean => {
  if (text.includes(term)) return true;
  if (term.length < 5) return false;
  const prefix = term.slice(0, 5);
  return text.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(prefix));
};

export const searchHelpArticles = <T extends HelpArticle>(articles: T[], query: string): T[] => {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return articles;

  return articles
    .map((article, index) => {
      const title = normalize(article.title);
      const keywords = normalize(article.keywords.join(' '));
      const description = normalize(article.description);
      const content = normalize(article.content);
      const haystack = `${title} ${keywords} ${description} ${content}`;
      if (!terms.every((term) => matchesTerm(haystack, term))) return null;

      const score = terms.reduce((total, term) => total
        + (matchesTerm(title, term) ? 8 : 0)
        + (matchesTerm(keywords, term) ? 4 : 0)
        + (matchesTerm(description, term) ? 2 : 0)
        + (matchesTerm(content, term) ? 1 : 0), 0);
      return { article, index, score };
    })
    .filter((result): result is { article: T; index: number; score: number } => result !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ article }) => article);
};
