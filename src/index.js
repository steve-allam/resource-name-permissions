import RNPermission from './RNPermission';
import RNPermissions from './RNPermissions';
import config from './config';
import validate from './validate';

function permission(perm) {
  return new RNPermission(perm);
}

function permissions(...perms) {
  return new RNPermissions(...perms);
}

permission.config = config;
permission.validate = validate;

export { permission, permissions };
