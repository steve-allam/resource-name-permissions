import _ from 'lodash';
import RNPermission from './RNPermission';

/**
 * Models multiple permissions.
 */
export default class RNPermissions {
  /**
   * Creates new RNPermission instance based on a permission string.
   */
  constructor(...perms) {
    this._permissions = _.flatten(perms).map(e => new RNPermission(e));
  }

  /**
   * Sets or retrieves permissions.
   */
  permissions(...perms) {
    if (perms.length > 0) {
      this._permissions = _.flatten(perms).map(e => new RNPermission(e));
      return this;
    }
    return this._permissions;
  }

  /**
   * Returns `true` when all specified permissions are covered by at least one
   * of the permissions.
   *
   * `permissions` can be either permission strings or an RNPermission object.
   *
   * Throws an error when any permission is invalid.
   */
  allows(...perms) {
    // Transform each permission string to an object.
    const permissions = _.flatten(perms).map(e => new RNPermission(e));

    // For each permission remove any privilege that is covered by any of our
    // own permissions.
    const ourPermissions = this.permissions();
    return permissions.every((permission) => {
      let i = 0;
      while (permission.privileges() > 0 && i < ourPermissions.length) {
        if (ourPermissions[i].matchIdentifier(permission)) {
          // Remove flag
          permission.privileges(permission.privileges() & ~ourPermissions[i].privileges());
        }
        i += 1;
      }
      return permission.privileges() === 0;
    });
  }

  /**
   * Returns `true` if any or a combination of this collection's permissions
   * allow granting `newPermission` to grantee.
   */
  mayGrant(newPermission, granteePermissions = []) {
    return this._mayGrantOrRevoke('mayGrant', newPermission, granteePermissions);
  }

  /**
   * Returns `true` if any or a combination of this collection's permissions
   * allow revoking `permission` from grantee.
   */
  mayRevoke(permission, granteePermissions = []) {
    return this._mayGrantOrRevoke('mayRevoke', permission, granteePermissions);
  }

   /**
    * This private function contains the common logic of `mayGrant` and
    * `mayRevoke`. Specify `functionName` either `mayGrant` or `mayRevoke`.
    */
  _mayGrantOrRevoke(functionName, newPermission, granteePermissions = []) {
    const newPerm = new RNPermission(newPermission);
    return this.permissions().some(ourPerm => ourPerm[functionName](newPerm, granteePermissions));
  }
}
