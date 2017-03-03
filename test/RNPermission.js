import { expect } from 'chai';
import { permission } from '../src/index';

beforeEach(() => {
  // Reset global config
  permission.config(false);
});

describe('permission', function () {
  this.slow(10);

  describe('constructor()', () => {
    it('should throw error when Resource Name Permission is not a string', () => {
      expect((() => permission(false)))
        .to.throw('Permission must be a string or RNPermission instance');
    });

    it('should throw error when Resource Name Permission does not have privileges', () => {
      expect((() => permission('article/1234')))
        .to.throw('Permission \'article/1234\' must contain at least 1 privilege delimited by \'?\'');
    });

    it('should parse a resource name permission', () => {
      const obj = permission('article/1234?read,update');
      expect(obj.identifier()).to.equal('article/1234');
      expect(obj.privileges()).to.equal(5);
    });

    it('should parse privilege aliases', () => {
      const obj = permission('article/1234?crud,own');
      expect(obj.privileges()).to.equal(15 + 32);
    });

    it('should parse privilege bitmask', () => {
      const obj = permission('article/1234?12');
      expect(obj.privileges()).to.equal(12);
    });

    it('should throw an error if privilege is out of bounds', () => {
      const func = () => permission('article/1234?128');
      expect(func).to.throw('Privilege must be a number between 1 and 127');
    });
  });

  describe('identifier()', () => {
    it('should change and return the permission identifier', () => {
      const perm = permission('article?read');
      perm.identifier('/test');
      expect(perm.identifier()).to.equal('/test');
    });

    it('should throw an error when identifier is not a string', () => {
      const perm = permission('article?read');
      const func = () => perm.identifier(false);
      expect(func).to.throw('Identifier must be a string');
    });
  });

  describe('privileges()', () => {
    it('should change permission privileges with an array', () => {
      const perm = permission('article?read');
      perm.privileges(['crud', 'manage,admin']);
      expect(perm.privileges()).to.equal(15 + 16 + 64);
    });

    it('should change permission privileges with a string', () => {
      const perm = permission('article?read');
      perm.privileges('crud,manage,admin');
      expect(perm.privileges()).to.deep.equal(15 + 16 + 64);
    });

    it('should throw an error when privileges is not an array or string', () => {
      const perm = permission('article?read');
      const func = () => perm.privileges(false);
      expect(func).to.throw('Privileges must be an array, string or number');
    });
  });

  describe('hasPrivilege', () => {
    it('should verify privilege bitmask', () => {
      expect(permission('article?crud').hasPrivilege('1')).to.equal(true);
      expect(permission('article?crud').hasPrivilege('1,4')).to.equal(true);
      expect(permission('article?crud').hasPrivilege(['1', '8', '12'])).to.equal(true);
      expect(permission('article?crud').hasPrivilege(1)).to.equal(true);
    });

    it('should verify privilege names', () => {
      expect(permission('article?crud').hasPrivilege('create,read,update,delete')).to.equal(true);
      expect(permission('article?crud').hasPrivilege(['read', 'update,delete'])).to.equal(true);
      expect(permission('article?crud').hasPrivilege('crud,manage')).to.equal(false);
    });

    it('should verify a combination of bitmask and privilege names', () => {
      expect(permission('article?crud').hasPrivilege('1,3,delete')).to.equal(true);
      expect(permission('article?crud').hasPrivilege(['1,delete', 3])).to.equal(true);
      expect(permission('article?crud').hasPrivilege(['1,own', 3])).to.equal(false);
    });

    it('should throw an error when privilege is not valid', () => {
      const perm = permission('article?read');
      const func = () => perm.hasPrivilege(false);
      expect(func).to.throw('Privilege must be an array, string or number');
    });
  });

  describe('hasPrivileges', () => {
    it('should be an alias of `hasPrivilege()`', () => {
      expect(permission('article?crud').hasPrivileges(['1,delete', 3])).to.equal(true);
      expect(permission('article?crud').hasPrivileges('read,update,delete,15')).to.equal(true);
      expect(permission('article?crud').hasPrivileges('16')).to.equal(false);
    });
  });

  describe('grantPrivileges()', () => {
    it('should return the permission\'s privileges which allow granting other privileges', () => {
      expect(permission('article?manage,own').grantPrivileges()).to.deep.equal(['manage', 'own']);
      expect(permission('article?crud,administrator,manage').grantPrivileges()).to.deep.equal(['manage', 'own', 'admin']);
    });
  });

  describe('grantsAllowed()', () => {
    it('should return bitmask describing which permissions may be granted', () => {
      expect(permission('article?manage,own').grantsAllowed()).to.equal(63);
      expect(permission('article?crud,admin,manage').grantsAllowed()).to.equal(127);
    });
  });

  describe('allows()', () => {
    it('should throw an error when permission is not a valid URL Permission string or object', () => {
      const perm = permission('article?read');
      const func = () => perm.allows('test');
      expect(func).to.throw('Permission \'test\' must contain at least 1 privilege delimited by \'?\'');
    });

    it('should allow basic permissions', () => {
      expect(permission('article?read').allows('article?read')).to.equal(true);
      expect(permission('article?read,update').allows('article?read')).to.equal(true);
      expect(permission('article?5').allows('article?read,update')).to.equal(true);
      expect(permission('article?read,update').allows('article?read,crud')).to.equal(false);
      expect(permission('article?read,update').allows('article?crud')).to.equal(false);
      expect(permission('article?crud').allows('article?read,update')).to.equal(true);
      expect(permission('article/1234/comment/87?read').allows('article?read')).to.equal(false);
      expect(permission('article/?read').allows('article/1234?read')).to.equal(false);
    });

    it('should allow wildcards', () => {
      expect(permission('art*cle?1').allows('article?1')).to.equal(true);
      expect(permission('article?1').allows('art*cle?1')).to.equal(false);
      expect(permission('art*cle?read').allows('artcle?read')).to.equal(true);
      expect(permission('artcle?read').allows('art*cle?read')).to.equal(false);
      expect(permission('article/?read').allows('art*cle?read')).to.equal(false);
      expect(permission('article*?read').allows('article?read')).to.equal(true);
      expect(permission('article?read').allows('article*?read')).to.equal(false);
      expect(permission('article?read').allows('article/*?read')).to.equal(false);
      expect(permission('article/*?read').allows('article/1234?read')).to.equal(true);
      expect(permission('article:*?read').allows('article:1234?read')).to.equal(true);
      expect(permission('article/?read').allows('article/1234/comment?read')).to.equal(false);
      expect(permission('article/1234/comment?read').allows('article/*?read')).to.equal(false);
      expect(permission('article/**?read').allows('article/1234/comment?read')).to.equal(true);
      expect(permission('article/1234/comment?read').allows('article*?read')).to.equal(false);
      expect(permission('article/1234/comment/87?read').allows('article/**/87?read')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permission('article?read').allows('article?read', 'article?update')).to.equal(false);
      expect(permission('article?owner').allows('article?read', 'article?update')).to.equal(true);
      expect(permission('article?owner').allows(['article?read', 'article?update'])).to.equal(true);
    });
  });

  describe('mayGrant()', () => {
    it('should allow basic grants', () => {
      expect(permission('article?admin').mayGrant('article?read')).to.equal(true);
      expect(permission('article?owner').mayGrant('article?crud')).to.equal(true);
      expect(permission('article?admin').mayGrant('article?read', ['article?delete', 'article?admin'])).to.equal(true);
      expect(permission('article?manage').mayGrant('article?read', ['/unrelated?admin'])).to.equal(true);
    });

    it('should allow grant when grant privilege can grant itself', () => {
      expect(permission('article?own').mayGrant('article?manage,own,crud')).to.equal(true);
      expect(permission('article?admin').mayGrant('article?admin,crud')).to.equal(true);
    });

    it('should not allow grant in basic use cases', () => {
      expect(permission('article?admin').mayGrant('article/1?read')).to.equal(false);
      expect(permission('article?read').mayGrant('article?read')).to.equal(false);
    });

    it('should allow grant with wildcards', () => {
      expect(permission('**?admin').mayGrant('article/*?read')).to.equal(true);
      expect(permission('article/**?admin').mayGrant('article/*?read')).to.equal(true);
      expect(permission('article/**?admin').mayGrant('article/*/test/*?read')).to.equal(true);
      expect(permission('article/*?admin').mayGrant('article/**?read')).to.equal(false);
      expect(permission('article/*?admin').mayGrant('article/*?read')).to.equal(true);
      expect(permission('article/*/comments?admin').mayGrant('article/*?read')).to.equal(false);
      expect(permission('article/*?admin').mayGrant('article/*/comments?read')).to.equal(false);
      expect(permission('article/**?admin').mayGrant('article/*/comments?read')).to.equal(true);
    });

    it('should not allow grant when permission has lesser or equal grant privileges', () => {
      expect(permission('article?crud,manage').mayGrant('article?update,delete,admin')).to.equal(false);
      expect(permission('article?manage').mayGrant('article?manage')).to.equal(false);
      expect(permission('article?admin').mayGrant('article?manage')).to.equal(true);
      expect(permission('article?administrator').mayGrant('article?admin')).to.equal(true);
    });

    it('should not allow grant if user has permission with ungrantable privilege', () => {
      expect(permission('article?manage').mayGrant('article?read', ['article?read', 'article?own'])).to.equal(false);
      expect(permission('article?manage').mayGrant('article?read', ['article?crud', 'article?manage'])).to.equal(false);
      expect(permission('article?manager').mayGrant('article?read', ['article?admin', 'article?manage'])).to.equal(false);
    });
  });

  describe('mayRevoke()', () => {
    it('should allow basic grants', () => {
      expect(permission('article?admin').mayRevoke('article?read')).to.equal(true);
      expect(permission('article?owner').mayRevoke('article?crud')).to.equal(true);
      expect(permission('article?admin').mayRevoke('article?read', ['article?delete', 'article?admin'])).to.equal(true);
      expect(permission('article?manage').mayRevoke('article?read', ['/unrelated?admin'])).to.equal(true);
    });

    it('should allow grant when grant privilege can grant itself', () => {
      expect(permission('article?own').mayRevoke('article?manage,own,crud')).to.equal(true);
      expect(permission('article?admin').mayRevoke('article?admin,crud')).to.equal(true);
    });

    it('should not allow grant in basic use cases', () => {
      expect(permission('article?admin').mayRevoke('article/1?read')).to.equal(false);
      expect(permission('article?read').mayRevoke('article?read')).to.equal(false);
    });

    it('should allow grant with wildcards', () => {
      expect(permission('article/**?admin').mayRevoke('article/*?read')).to.equal(true);
      expect(permission('article/**?admin').mayRevoke('article/*/test/*?read')).to.equal(true);
      expect(permission('article/*?admin').mayRevoke('article/**?read')).to.equal(false);
      expect(permission('article/*?admin').mayRevoke('article/*?read')).to.equal(true);
      expect(permission('article/*/comments?admin').mayRevoke('article/*?read')).to.equal(false);
      expect(permission('article/*?admin').mayRevoke('article/*/comments?read')).to.equal(false);
      expect(permission('article/**?admin').mayRevoke('article/*/comments?read')).to.equal(true);
    });

    it('should not allow grant when permission has lesser or equal grant privileges', () => {
      expect(permission('article?crud,manage').mayRevoke('article?update,delete,admin')).to.equal(false);
      expect(permission('article?manage').mayRevoke('article?manage')).to.equal(false);
      expect(permission('article?admin').mayRevoke('article?manage')).to.equal(true);
      expect(permission('article?administrator').mayRevoke('article?admin')).to.equal(true);
    });

    it('should not allow grant if user has permission with ungrantable privilege', () => {
      expect(permission('article?manage').mayRevoke('article?read', ['article?read', 'article?own'])).to.equal(false);
      expect(permission('article?manage').mayRevoke('article?read', ['article?crud', 'article?manage'])).to.equal(false);
      expect(permission('article?manager').mayRevoke('article?read', ['article?admin', 'article?manage'])).to.equal(false);
    });
  });

  describe('clone()', () => {
    it('should make a clone of permission', () => {
      const a = permission('article/**?manage');
      const b = a.clone();
      a.identifier('new');
      a.privileges(['read']);
      expect(a.identifier()).to.equal('new');
      expect(a.privileges()).to.equal(1);
      expect(b.identifier()).to.equal('article/**');
      expect(b.privileges()).to.equal(16);
    });
  });

  describe('toObject()', () => {
    it('should create object representation of permission', () => {
      expect(permission('article/**/1234?crud').toObject()).to.deep.equal({
        identifier: 'article/**/1234',
        privileges: 15,
      });
    });
  });

  describe('toString()', () => {
    it('should create string representation of permission', () => {
      const input = 'article/**/1234?crud,admin';
      const output = 'article/**/1234?79';
      expect(permission(input).toString()).to.equal(output);
    });
  });
});
