import assert from 'assert';

import utils from '../../lib/utils';


describe('utils.getAllRegions', () => {
    it('should return official AWS regions', () => {
        const allRegions = utils.getAllRegions();

        assert(allRegions.indexOf('ap-northeast-1') >= 0);
        assert(allRegions.indexOf('ap-southeast-1') >= 0);
        assert(allRegions.indexOf('ap-southeast-2') >= 0);
        assert(allRegions.indexOf('eu-central-1') >= 0);
        assert(allRegions.indexOf('eu-west-1') >= 0);
        assert(allRegions.indexOf('sa-east-1') >= 0);
        assert(allRegions.indexOf('us-west-1') >= 0);
        assert(allRegions.indexOf('us-west-2') >= 0);
        assert(allRegions.indexOf('us-east-1') >= 0);
        assert(allRegions.indexOf('us-gov-west-1') >= 0);
    });

    it('should return regions from config', () => {
        const allRegions = utils.getAllRegions();

        assert(allRegions.indexOf('localregion') >= 0);
    });
});

describe('utils.getAllEndpoints', () => {
    it('should return endpoints from config', () => {
        const allEndpoints = utils.getAllEndpoints();

        assert(allEndpoints.indexOf('s3-us-west-2.amazonaws.com') >= 0);
        assert(allEndpoints.indexOf('s3.amazonaws.com') >= 0);
        assert(allEndpoints.indexOf('s3-external-1.amazonaws.com') >= 0);
        assert(allEndpoints.indexOf('s3.us-east-1.amazonaws.com') >= 0);
        assert(allEndpoints.indexOf('localhost') >= 0);
    });
});

describe('utils.isValidBucketName', () => {
    it('should return false if bucketname is fewer than ' +
        '3 characters long', () => {
        const result = utils.isValidBucketName('no');
        assert.strictEqual(result, false);
    });

    it('should return false if bucketname is greater than ' +
        '63 characters long', () => {
        const longString = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const result = utils.isValidBucketName(longString);
        assert.strictEqual(result, false);
    });

    it('should return false if bucketname contains capital letters', () => {
        const result = utils.isValidBucketName('noSHOUTING');
        assert.strictEqual(result, false);
    });

    it('should return false if bucketname is an IP address', () => {
        const result = utils.isValidBucketName('172.16.254.1');
        assert.strictEqual(result, false);
    });

    it('should return false if bucketname is not DNS compatible', () => {
        const result = utils.isValidBucketName('*notvalid*');
        assert.strictEqual(result, false);
    });

    it('should return true if bucketname does not break rules', () => {
        const result = utils.isValidBucketName('okay');
        assert.strictEqual(result, true);
    });
});

const bucketName = 'bucketname';
const objName = 'testObject';

describe('utils.normalizeRequest', () => {
    it('should parse bucket name from path', () => {
        const request = {
            url: `/${bucketName}`,
            headers: { host: 's3.amazonaws.com' },
        };
        const result = utils.normalizeRequest(request);
        assert.strictEqual(result.bucketName, bucketName);
        assert.strictEqual(result.parsedHost, 's3.amazonaws.com');
    });

    it('should parse bucket and object name from path', () => {
        const request = {
            url: `/${bucketName}/${objName}`,
            headers: { host: 's3.amazonaws.com' },
        };
        const result = utils.normalizeRequest(request);
        assert.strictEqual(result.bucketName, bucketName);
        assert.strictEqual(result.objectKey, objName);
        assert.strictEqual(result.parsedHost, 's3.amazonaws.com');
    });
});
