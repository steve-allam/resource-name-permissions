import { expect } from 'chai';
import { permission } from '../src/index';

describe('validate(...)', function () {
  this.slow(10);

  it('should return true when string is valid', () => {
    expect(permission.validate('article+:crud,manage')).to.equal(true);
    expect(permission.validate('article:1234:3')).to.equal(true);
    expect(permission.validate('/articles+:crud,manage,admin')).to.equal(true);
    expect(permission.validate('art*le:1234:owner')).to.equal(true);
    expect(permission.validate('article:**:owner')).to.equal(true);
  });

  it('should return false when using invalid characters', () => {
    const invalidChars = ['!', '@', '#', '$', '%', '^', '&', '(', ')', '[', ']', '±', '{', '}'];
    invalidChars.forEach(char => expect(permission.validate(`${char}:read`)).to.equal(false));
  });

  it('should return false string with global config', () => {
    expect(permission.validate('article,manage')).to.equal(false);
    expect(permission.validate('article/manage')).to.equal(false);
    expect(permission.validate(false)).to.equal(false);
    expect(permission.validate('articles:unknown')).to.equal(false);
    expect(permission.validate('articles:255')).to.equal(false);
    expect(permission.validate('articles:0')).to.equal(false);
    expect(permission.validate('articles:crudmanage')).to.equal(false);
    expect(permission.validate(':create')).to.equal(false);
  });

  it('should return false when multistar is not contained within a segment', () => {
    expect(permission.validate('article/**t:read')).to.equal(false);
    expect(permission.validate('article/t**:read')).to.equal(false);
    expect(permission.validate('article/**.*/:read')).to.equal(false);
  });
});
