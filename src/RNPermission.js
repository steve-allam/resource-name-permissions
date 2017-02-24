import _ from 'lodash';
import globToRegex from './globToRegex';
import config from './config';
import { isNumeric } from './util';

/**
 * Models a permission string.
 */
export default class RNPermission {
  /**
   * Creates new RNPermission instance based on a permission string.
   */
  constructor(permission) {
    if (_.isString(permission)) {
      // Parse permission string using global config options
      this._config = _.cloneDeep(config());
      const props = this._parse(permission);
      Object.assign(this, {
        _identifier: props.identifier,
        _privileges: props.privileges,
      });
    } else if (permission instanceof RNPermission) {
      // Copy all private properties
      Object.assign(this, {
        _config: _.cloneDeep(permission._config),
        _identifier: permission.identifier(),
        _privileges: _.cloneDeep(permission.privileges()),
      });
    } else {
      throw new Error('Permission must be a string or RNPermission instance');
    }
  }

  /**
   * Sets or retrieves the resource identifier.
   */
  identifier(identifier) {
    if (identifier !== undefined) {
      if (_.isString(identifier)) {
        this._identifier = identifier;
      } else {
        throw new Error('Identifier must be a string');
      }
      return this;
    }
    return this._identifier;
  }

  /**
   * Sets or retrieves privileges.
   */
  privileges(privileges) {
    if (privileges !== undefined) {
      if (_.isArray(privileges)) {
        this._privileges = this._parsePrivileges(privileges.join(','));
      } else if (_.isString(privileges)) {
        this._privileges = this._parsePrivileges(privileges);
      } else if (_.isNumber(privileges)) {
        this._privileges = privileges;
      } else {
        throw new Error('Privileges must be an array, string or number');
      }
      return this;
    }
    return this._privileges;
  }

  /**
   * Returns `true` if permission has specified privilege.
   */
  hasPrivilege(privilege) {
    if (_.isArray(privilege)) {
      return _.every(privilege, e => this.hasPrivilege(e));
    }

    // Privilege is itself a bitmask
    const ourBitmask = this.privileges();
    if (_.isNumber(privilege)) {
      return (privilege <= ourBitmask) && (ourBitmask & privilege) > 0;
    }

    // Privilege is a string
    if (_.isString(privilege)) {
      return privilege.split(',').every((e) => {
        const bitmask = this._parsePrivileges(e);

        // Returns true if bitmask is captured in our bitmask
        return (bitmask <= ourBitmask) && (ourBitmask & bitmask) > 0;
      });
    }

    throw new Error('Privilege must be an array, string or number');
  }

  /**
   * Returns `true` if permission has specified privileges.
   */
  hasPrivileges(privileges) {
    return this.hasPrivilege(privileges);
  }

  /**
   * Returns array with all privilege names that enable granting new privileges.
   */
  grantPrivileges() {
    const result = [];
    Object.keys(this._config.grantPrivileges).forEach((privilege) => {
      if (this.hasPrivilege(privilege)) {
        result.push(privilege);
      }
    });
    return result;
  }

  /**
   * Returns bitmask describing which permissions may be granted.
   */
  grantsAllowed() {
    return this.grantPrivileges().reduce((a, b) => (
      a | this._config.grantPrivileges[b]
    ), 0);
  }

  /**
   * Parses a Resource Name Permission and returns an object with all
   * properties.
   *
   * For example, `articles/**:read,update` returns the following:
   * ```
   * {
   *   identifier: 'article/**',
   *   privileges: 5,
   * }
   * ```
   */
  _parse(permission) {
    if (!_.isString(permission)) {
      throw new Error('Permission must be a string');
    }

    const result = {
      identifier: null,
      privileges: [],
    };

    // Determine identifier and privileges
    const delimiterIndex = permission.lastIndexOf(':');
    if (delimiterIndex === -1) {
      throw new Error('Permission must contain at least 1 privilege delimited by ":"');
    }
    result.identifier = permission.substring(0, delimiterIndex);
    result.privileges = this._parsePrivileges(permission.substring(delimiterIndex + 1));

    return result;
  }

  /**
   * Parses Resource Name Permission privileges and returns its bitmask.
   *
   * A single Resource Name Permission privilege is either one or more abbreviations,
   * an alias or an integer.
   *
   * For example, `13`, `read`, `owner`, and `read,update` are valid.
   */
  _parsePrivileges(privilegeString) {
    // When privilege is a number ensure it is within range
    if (isNumeric(privilegeString)) {
      const result = parseInt(privilegeString, 10);
      const max = _.max(_.values(this._config.privileges));
      if (result <= 0 || result > max) {
        throw new Error(`Privilege must be a number between 1 and ${max}`);
      }
      return result;
    }

    // Add each permission to bitmask
    let bitmask = 0;
    privilegeString.split(',').forEach((privilege) => {
      if (!this._config.privileges[privilege]) {
        throw new Error(`Privilege '${privilege}' does not exist`);
      }
      bitmask |= this._config.privileges[privilege];
    });
    return bitmask;
  }

  /**
   * Checks whether privileges are covered by this Resource Name Permission.
   *
   * Returns `true` if all privileges are covered by specified `userPrivileges`,
   * otherwise returns `false`.
   */
  matchPrivileges(userPrivileges) {
    const ourPrivileges = this.privileges();
    return (userPrivileges <= ourPrivileges) && ((ourPrivileges & userPrivileges) !== 0);
  }

  /**
   * Checks whether identifier is covered by this Resource Name Permission.
   *
   * Returns `true` when identifier matches, otherwise return `false`.
   */
  matchIdentifier(permission) {
    let identifier;
    if (_.isString(permission)) {
      identifier = (new RNPermission(permission)).identifier();
    } else {
      identifier = permission.identifier();
    }
    return globToRegex(this.identifier()).test(identifier);
  }

  /**
   * Returns `true` when this permission covers all specified permissions.
   *
   * `permissions` can be either permission strings or RNPermission objects.
   *
   * Throws an error when permission string is invalid.
   */
  allows(...permissions) {
    const perms = _.flatten(permissions).map(e => new RNPermission(e));
    return perms.every(e => this.matchIdentifier(e) && this.matchPrivileges(e.privileges()));
  }

  /**
   * Returns `true` if permission allows granting `permission` to grantee.
   */
  mayGrant(permission, granteePermissions = []) {
    const newPermission = new RNPermission(permission);
    if (this.grantsAllowed() === 0 || !this.matchIdentifier(newPermission)) return false;

    // All other grantPrivileges must be covered by our grantPrivileges
    return this._areLesserPrivileges(newPermission, granteePermissions);
  }

  /**
   * Returns `true` if permission allows revoking `permission` from grantee.
   */
  mayRevoke(permission, granteePermissions = []) {
    return this.mayGrant(permission, granteePermissions);
  }

  /**
   * Returns `true` when none of `granteePermissions` privileges are grant
   * privileges that are higher up in hierarchy.
   */
  _areLesserPrivileges(newPermission, granteePermissions = []) {
    // All privileges to be granted must be covered by our own bitmask
    const allowedBitmask = this.grantsAllowed();
    const toGrantBitmask = newPermission.privileges();
    if (toGrantBitmask > allowedBitmask || toGrantBitmask & allowedBitmask === 0) {
      return false;
    }

    // Any privileges that may be granted by grantee must be covered by grantor
    if (granteePermissions.length > 0) {
      const allGranteePrivs = granteePermissions
        .map(e => new RNPermission(e))
        .filter(e => e.matchIdentifier(this))
        .map(e => e.grantPrivileges()) // Get bitmasks of grant privileges themselves, not what they grant!
        .reduce((a, b) => a.concat(b), []) // flatten
        .map(e => (e ? this._config.privileges[e] : 0))
        .reduce((a, b) => a | b, 0);
      if (allGranteePrivs !== 0 && (allGranteePrivs > allowedBitmask || allowedBitmask & allGranteePrivs === 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a clone of this RNPermission.
   */
  clone() {
    return new RNPermission(this);
  }

  /**
   * Returns an object representation of a Resource Name Permission.
   */
  toObject() {
    return {
      identifier: this.identifier(),
      privileges: this.privileges(),
    };
  }

  /**
   * Returns a string representation of a Resource Name Permission.
   */
  toString() {
    return `${this.identifier()}:${this.privileges()}`;
  }
}
