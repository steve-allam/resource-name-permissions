import _ from 'lodash';
import RNPermission from './RNPermission.js';

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
   * Returns a privilege name given a number
   */

  privilegeToName(privilege)
  {
    var preverse = _.invert(privilege._config.privileges);
    return preverse[''+privilege._privileges];
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
   * Returns an array of those permissions that 'allow' the resource
   */

  allowsBy(...perms) 
  {
    // Transform each permission string to an object.
    var permissions = _.flatten(perms).map(e => new RNPermission(e));

    // For each permission remove any privilege that is covered by any of our
    // own permissions.
    var ourPermissions = this.permissions();
    var ourMatches = [];
    for (var index in permissions) 
    {

      var i = 0;
      while (permissions[index].privileges() > 0 && i < ourPermissions.length) {
        if (ourPermissions[i].matchIdentifier(permissions[index])) {
          // Add to matches array
          if (permissions[index].privileges() & ourPermissions[i].privileges()) { ourMatches.push(ourPermissions[i].identifier()+'?'+this.privilegeToName(ourPermissions[i])); }
        }
        i += 1;
      }
    };
    return ourMatches;
  }

  /**
   * Returns `true` if there are any child permissions on the given identifier
   *
   */

  hasChildren(identifier) 
  {

    var  myPerm = new RNPermission(identifier+'/**?1');
    // Go through permissions
    var ourPermissions = this.permissions();
    var i = 0;
    while (i < ourPermissions.length) 
    {
      if (ourPermissions[i].matchIdentifier(identifier+'/**') ||
          myPerm.matchIdentifier(ourPermissions[i].identifier())) { return true; }
      i += 1;
    }
    return false;

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
