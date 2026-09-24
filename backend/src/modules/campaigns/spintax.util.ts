/**
 * Utility to parse Spintax format like "{Hi|Hello|Hey} {dear|friend}!"
 * and interpolate user variables {firstName}, {username}, {phone}.
 */
export function parseSpintax(template: string, variables: Record<string, string> = {}): string {
  if (!template) return '';

  let result = template;

  // 1. Initial pass: interpolate user variables if present
  for (const [key, value] of Object.entries(variables)) {
    const varRegex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(varRegex, value || '');
  }

  // 2. Resolve Spintax blocks containing '|' (e.g. {Hello|Hi|Greetings})
  const spintaxRegex = /\{([^{}]*\|[^{}]*)\}/g;
  let iterations = 0;
  while (spintaxRegex.test(result) && iterations < 20) {
    result = result.replace(spintaxRegex, (_match, choices) => {
      const parts = choices.split('|');
      const randomIndex = Math.floor(Math.random() * parts.length);
      return parts[randomIndex];
    });
    iterations++;
  }

  // 3. Final safety pass for any variables that were inside nested Spintax choices
  for (const [key, value] of Object.entries(variables)) {
    const varRegex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(varRegex, value || '');
  }

  // 4. Clean up any standard remaining unprovided placeholders
  const standardPlaceholders = ['firstName', 'lastName', 'username', 'phone', 'name'];
  for (const ph of standardPlaceholders) {
    if (!(ph in variables)) {
      result = result.replace(new RegExp(`\\{${ph}\\}`, 'gi'), '');
    }
  }

  return result;
}
