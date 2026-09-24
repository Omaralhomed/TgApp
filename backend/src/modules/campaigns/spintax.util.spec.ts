import { parseSpintax } from './spintax.util';

describe('Spintax & Personalization Utility', () => {
  it('should interpolate single variable correctly', () => {
    const template = 'Hello {firstName}, welcome!';
    const result = parseSpintax(template, { firstName: 'Ahmed' });
    expect(result).toBe('Hello Ahmed, welcome!');
  });

  it('should resolve spintax choices randomly within candidates', () => {
    const template = '{مرحبا|أهلا|السلام عليكم} يا {firstName}';
    const validGreetings = ['مرحبا', 'أهلا', 'السلام عليكم'];

    for (let i = 0; i < 20; i++) {
      const result = parseSpintax(template, { firstName: 'محمد' });
      const matched = validGreetings.some((g) => result.startsWith(g));
      expect(matched).toBe(true);
      expect(result).toContain('يا محمد');
    }
  });

  it('should resolve nested spintax expressions', () => {
    const template = '{Hi|{Hello|Hey}} there!';
    const validOutputs = ['Hi there!', 'Hello there!', 'Hey there!'];

    for (let i = 0; i < 15; i++) {
      const result = parseSpintax(template);
      expect(validOutputs).toContain(result);
    }
  });

  it('should handle missing variables by replacing with empty string', () => {
    const template = 'Dear {firstName} {lastName}!';
    const result = parseSpintax(template, { firstName: 'Sami' });
    expect(result).toBe('Dear Sami !');
  });

  it('should handle empty or null template safely', () => {
    expect(parseSpintax('')).toBe('');
  });
});
