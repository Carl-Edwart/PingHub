export enum ContentLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ContentType {
  VIDEO = 'video',
  ARTICLE = 'article',
}

export interface TechniqueContent {
  id: string;
  title: string;
  level: ContentLevel;
  category: string;
  description: string;
  url: string;
  type: ContentType;
  viewedAt?: string;
}

export interface Rule {
  id: string;
  title: string;
  category: string;
  content: string;
  source: 'ittf' | 'local';
  relatedRules?: string[];
}

export interface RuleSection {
  title: string;
  rules: Rule[];
}
