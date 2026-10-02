import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommunityAIService {
  private readonly logger = new Logger(CommunityAIService.name);

  // Helper to simulate API latency
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async improveText(text: string): Promise<string> {
    this.logger.log('Calling AI to improve text...');
    await this.delay(1000); // simulated latency

    // Very basic mock logic: capitalize first letter, add a period if missing.
    // In a real app, this would call OpenAI or Anthropic SDK.
    let improved = text.trim();
    if (improved.length > 0) {
      improved = improved.charAt(0).toUpperCase() + improved.slice(1);
      if (
        !improved.endsWith('.') &&
        !improved.endsWith('!') &&
        !improved.endsWith('?')
      ) {
        improved += '.';
      }
    }
    return `[AI Improved] ${improved}`;
  }

  async suggestTags(text: string): Promise<string[]> {
    this.logger.log('Calling AI to suggest tags...');
    await this.delay(800);

    // Mock logic based on keywords
    const tags = [];
    const lower = text.toLowerCase();
    if (lower.includes('react') || lower.includes('component'))
      tags.push('React');
    if (lower.includes('api') || lower.includes('backend'))
      tags.push('Backend');
    if (lower.includes('design') || lower.includes('ui')) tags.push('UI/UX');
    if (tags.length === 0) {
      tags.push('General', 'Discussion');
    }
    return tags;
  }

  async summarize(text: string): Promise<string> {
    this.logger.log('Calling AI to summarize...');
    await this.delay(1500);

    if (text.length < 50) return text;

    // Mock summary: take the first sentence
    const firstSentence = text.split('.')[0] || text;
    return `Summary: ${firstSentence}.`;
  }

  async scanForModeration(
    text: string,
  ): Promise<{ isSafe: boolean; reason?: string }> {
    this.logger.log('AI scanning for moderation...');
    await this.delay(500);

    // Mock unsafe keywords
    const badWords = [
      'spam_link',
      'buy_now_cheap',
      'offensive_word',
      'hate_speech',
    ];
    const lower = text.toLowerCase();

    for (const word of badWords) {
      if (lower.includes(word)) {
        return { isSafe: false, reason: `Contains flagged keyword: ${word}` };
      }
    }

    return { isSafe: true };
  }
}
