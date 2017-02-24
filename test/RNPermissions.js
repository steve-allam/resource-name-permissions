import { expect } from 'chai';
import { permissions } from '../src/index';

describe('permissions', function () {
  this.slow(10);

  describe('constructor()', () => {
    it('should throw error when URL permission is not a string', () => {
      const func = () => permissions('article:read', { foo: 'bar' });
      expect(func).to.throw('Permission must be a string');
    });

    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('article');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });
  });

  describe('allows()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('article:read').allows('article');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should allow basic permissions', () => {
      expect(permissions('article:read', 'article:update').allows('article:read,update')).to.equal(true);
    });

    it('should allow wildcards', () => {
      expect(permissions('article/*:read', 'article/*:update').allows('article/article-1:read,update')).to.equal(true);
      expect(permissions('article/*:read', 'article:update').allows('article/article-1:read,update')).to.equal(false);
    });

    it('should match multiple permissions', () => {
      expect(permissions('article:read', 'article:update').allows('article:read,update')).to.equal(true);
      expect(permissions('article:read', 'article:update').allows(['article:read', 'article:update'])).to.equal(true);
    });
  });

  describe('permissions()', () => {
    it('should return permissions', () => {
      const perms = permissions('article/*:read', 'article/article-2:update').permissions();
      expect(perms).to.have.length(2);
      expect(perms[0].identifier()).to.equal('article/*');
      expect(perms[0].privileges()).to.equal(1);
      expect(perms[1].identifier()).to.equal('article/article-2');
      expect(perms[1].privileges()).to.equal(4);
    });

    it('should change permissions', () => {
      const perms = permissions('article/*:read', 'article/article-2:update');
      perms.permissions('user/user-1:owner', 'article/article-3:read');
      const result = perms.permissions();
      expect(result).to.have.length(2);
      expect(result[0].identifier()).to.equal('user/user-1');
      expect(result[0].privileges()).to.equal(63);
      expect(result[1].identifier()).to.equal('article/article-3');
      expect(result[1].privileges()).to.equal(1);
    });
  });

  describe('mayGrant()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('article:read').mayGrant('article?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('article:read', 'article:manage').mayGrant('article:read,update')).to.equal(true);
      expect(permissions('article:read', 'article:update').mayGrant('article:read,update')).to.equal(false);
    });
  });

  describe('mayRevoke()', () => {
    it('should throw error when URL permission is invalid', () => {
      const func = () => permissions('article:read').mayGrant('article?author=user1');
      expect(func).to.throw('Permission must contain at least 1 privilege delimited by ":"');
    });

    it('should grant basic permissions', () => {
      expect(permissions('article:read', 'article:manage').mayGrant('article:read,update')).to.equal(true);
      expect(permissions('article:read', 'article:update').mayGrant('article:read,update')).to.equal(false);
    });
  });
});
