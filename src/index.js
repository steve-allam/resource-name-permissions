import RNPermission from './RNPermission.js';
import RNPermissions from './RNPermissions.js';
import config from './config.js';
import validate from './validate.js';

function permission(perm) {
  return new RNPermission(perm);
}

function permissions(...perms) {
  return new RNPermissions(...perms);
}

permission.config = config;
permission.validate = validate;

export { permission, permissions };
