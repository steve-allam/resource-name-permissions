import _ from 'lodash';
import config from './config';
import { isNumeric } from './util';

/**
 * Validates privilege string.
 *
 * A privilege string can contain any combination of privilege names and numbers.
 *
 * Example:
 * ```
 * validatePrivileges('crud,manage'); // true
 * validatePrivileges('5,read'); // true
 * validatePrivileges('invalid'); // false
 * ```
 */
function validatePrivileges(privilegeString) {
  const settings = config();
  const privileges = privilegeString.split(',');
  const privilegeNames = Object.keys(settings.privileges);
  const privilegeNumbers = _.values(settings.privileges);

  for (const privilege of privileges) {
    if (isNumeric(privilege)) {
      if (privilege < Math.min(...privilegeNumbers)) return false;
      if (privilege >= Math.max(...privilegeNumbers) * 2) return false;
    } else if (!privilegeNames.includes(privilege)) {
      return false;
    }
  }
  return true;
}

/**
 * Validates a resource name permission string.
 */
export default (permission) => {
  if (!_.isString(permission)) {
    return false;
  }

  // Check if string contains privilege delimiter
  const privilegeDelimiterIndex = permission.lastIndexOf('?');
  if (privilegeDelimiterIndex <= 0) { // 0 or -1 are both invalid
    return false;
  }

  // Check if identifier contains only valid characters
  const identifier = permission.substring(0, privilegeDelimiterIndex);
  if (!/[a-zA-Z0-9._\-:/*]+/.test(identifier)) {
    return false;
  }

  // A multistar must be preceded and followed by a `:`, `/` or no charachters at all
  if (/\*\*[^:/?]/.test(identifier)) return false;
  if (/[^:/]\*\*/.test(identifier)) return false;

  // Check if all privileges are valid aliases, action names or identifiers
  const validPrivilege = validatePrivileges(permission.substring(privilegeDelimiterIndex + 1));
  if (!validPrivilege) return false;

  return true;
};
