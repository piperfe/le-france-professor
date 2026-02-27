import { Topic, TopicCategory } from './topic';

describe('Topic', () => {
  it('should create AI adoption topic', () => {
    const topic = Topic.createAIAdoptionInFrance();
    expect(topic.title).toContain('IA');
    expect(topic.category).toBe(TopicCategory.TECHNOLOGY);
    expect(topic.description).toBeDefined();
  });

  it('should create French culture topic', () => {
    const topic = Topic.createFrenchCulture();
    expect(topic.title).toContain('culture');
    expect(topic.category).toBe(TopicCategory.CULTURE);
  });

  it('should create French language worldwide topic', () => {
    const topic = Topic.createFrenchLanguageWorldwide();
    expect(topic.title).toContain('français');
    expect(topic.category).toBe(TopicCategory.LANGUAGE);
  });

  it('should throw error for empty title', () => {
    expect(() => {
      new Topic('', 'description', TopicCategory.CULTURE);
    }).toThrow('Topic title cannot be empty');
  });

  it('should throw error for empty description', () => {
    expect(() => {
      new Topic('title', '', TopicCategory.CULTURE);
    }).toThrow('Topic description cannot be empty');
  });
});
