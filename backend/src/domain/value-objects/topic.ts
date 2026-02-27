export class Topic {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly category: TopicCategory,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Topic title cannot be empty');
    }
    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Topic description cannot be empty');
    }
  }

  static createAIAdoptionInFrance(): Topic {
    return new Topic(
      "L'adoption de l'IA en France",
      "Explorons comment la France adopte et intègre l'intelligence artificielle dans différents secteurs.",
      TopicCategory.TECHNOLOGY,
    );
  }

  static createFrenchCulture(): Topic {
    return new Topic(
      'La culture française',
      'Découvrons les richesses de la culture française, de l\'art à la gastronomie.',
      TopicCategory.CULTURE,
    );
  }

  static createFrenchLanguageWorldwide(): Topic {
    return new Topic(
      'Le français dans le monde',
      'Explorons la présence et l\'influence de la langue française à travers le globe.',
      TopicCategory.LANGUAGE,
    );
  }
}

export enum TopicCategory {
  TECHNOLOGY = 'technology',
  CULTURE = 'culture',
  LANGUAGE = 'language',
  HISTORY = 'history',
  SOCIETY = 'society',
}
