/**
 * Parses * and ** in glob pattern.
 */
export default (pattern) => {
  let result = '';
  let char = '';

  for (let i = 0, len = pattern.length; i < len; i += 1) {
    char = pattern[i];

    switch (char) {
      case '$':
      case '.':
      case '=':
      case '!':
      case '^':
      case '+':
      case '|':
      case '[':
      case ']':
      case '(':
      case ')':
      case '?':
      case '{':
      case '}':
      case '/':
      case '\\':
        result += `\\${char}`; // Escape reserved regex character
        break;
      case '*': {
        // A globstar is `abc/**/xyz`, `abc/**`, `**/abc` but not `/a**/`.
        // To determine if it is a ** rather than *, consume all consecutive "*"
        // and find the chars directly before and after '**'

        // "Consume" all * and determine which characters are before and after the globstar
        const prev = pattern[i - 1];
        let multipleStars = false;
        while (pattern[i + 1] === '*') {
          multipleStars = true;
          i += 1;
        }
        const next = pattern[i + 1];

        // If there are multiple stars immediately preceded and followed by a `/`
        // or `:` it is a valid globstar
        if (multipleStars
          && (!prev || prev === '/' || prev === ':')
          && (!next || next === '/' || next === ':'))
        {
          // Match zero or more segments
          result += '([^/:]*(/|:|$))*';
          i += 1; // Move past "/" or ":"
        } else {
          // Match a normal glob, that is any character except `/`, `:` and `**`
          result += '((?!(\\*\\*|/|:)).)*';
        }
        break;
      }
      default:
        result += char;
    }
  }

  return new RegExp(`^${result}$`);
};
