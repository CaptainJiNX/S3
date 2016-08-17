import url from 'url';
import crypto from 'crypto';
import xmlService from 'xml';

import config from './Config';
import constants from './constants';

/*
 * =============================================
 *  Modified by Roger Wilson (ctjinx@gmail.com)
 * =============================================
 */

const utils = {};

/**
 * Get all valid regions, according to our configuration.
 * Valid regions are Amazon official regions + custom regions declared in conf.
 *
 * @returns {string[]} - list of valid regions
 */
utils.getAllRegions = function getAllRegions() {
    const awsOfficialRegions = [
        'ap-northeast-1', 'ap-southeast-1', 'ap-southeast-2', 'eu-central-1',
        'eu-west-1', 'sa-east-1', 'us-east-1', 'us-west-1', 'us-west-2',
        'us-gov-west-1'];
    return Object.keys(config.regions).concat(awsOfficialRegions);
};

/**
 * Get all valid endpoints, according to our configuration
 *
 * @returns {string[]} - list of valid endpoints
 */
utils.getAllEndpoints = function getAllEndpoints() {
    return Object.keys(config.regions)
        .map(r => config.regions[r])
        .reduce((a, b) => a.concat(b));
};

/**
 * Get bucket name and object name from the request
 * @param {object} request - http request object
 * @returns {object} result - returns object containing bucket
 * name and objectKey as key
 */
utils.getResourceNames = function getResourceNames(request) {
    const resources = {
        bucket: undefined,
        object: undefined,
        host: undefined,
        path: undefined,
    };
    const pathname = url.parse(request.url).pathname;
    // If there are spaces in a key name, s3cmd sends them as "+"s.
    // Actual "+"s are uri encoded as "%2B" so by switching "+"s to
    // spaces here, you still retain any "+"s in the final decoded path
    const pathWithSpacesInsteadOfPluses = pathname.replace(/\+/g, ' ');
    const path = decodeURIComponent(pathWithSpacesInsteadOfPluses);
    resources.path = path;
    const fullHost = request.headers && request.headers.host
        ? request.headers.host.split(':')[0] : undefined;

    resources.host = fullHost;
    const urlArr = path.split('/');
    if (urlArr.length > 1) {
        resources.bucket = urlArr[1];
        resources.object = urlArr.slice(2).join('/');
    } else if (urlArr.length === 1) {
        resources.bucket = urlArr[1];
    }

    // remove any empty strings or nulls
    if (resources.bucket === '' || resources.bucket === null) {
        resources.bucket = undefined;
    }
    if (resources.object === '' || resources.object === null) {
        resources.object = undefined;
    }
    return resources;
};

/**
 * Validate bucket name per naming rules and restrictions
 * @param {string} bucketname - name of the bucket to be created
 * @return {boolean} - returns true/false by testing
 * bucket name against validation rules
 */
utils.isValidBucketName = function isValidBucketName(bucketname) {
    const ipAddressRegex = new RegExp(/(\d+\.){3}\d+/);
    const dnsRegex = new RegExp(/^[a-z0-9]+([\.\-]{1}[a-z0-9]+)*$/);
    // Must be at least 3 and no more than 63 characters long.
    if (bucketname.length < 3 || bucketname.length > 63) {
        return false;
    }
    // Must not start with the mpuBucketPrefix since this is
    // reserved for the shadow bucket used for multipart uploads
    if (bucketname.startsWith(constants.mpuBucketPrefix)) {
        return false;
    }
    // Must not contain more than one consecutive period
    if (bucketname.indexOf('..') > 1) {
        return false;
    }
    // Must not be an ip address
    if (bucketname.match(ipAddressRegex)) {
        return false;
    }
    // Must be dns compatible
    return !!bucketname.match(dnsRegex);
};

utils.getContentMD5 = function getContentMD5(requestBody) {
    return crypto.createHash('md5').update(requestBody).digest('base64');
};

/**
 * Parse content-md5 from meta headers
 * @param {string} headers - request headers
 * @return {string} - returns content-md5 string
 */
utils.parseContentMD5 = function parseContentMD5(headers) {
    if (headers['x-amz-meta-s3cmd-attrs']) {
        const metaHeadersArr = headers['x-amz-meta-s3cmd-attrs'].split('/');
        for (let i = 0; i < metaHeadersArr.length; i++) {
            const tmpArr = metaHeadersArr[i].split(':');
            if (tmpArr[0] === 'md5') {
                return tmpArr[1];
            }
        }
    }
    return '';
};


/**
 * Pull user provided meta headers from request headers
 * @param {object} headers - headers attached to the http request (lowercased)
 * @return {object} all user meta headers
 */
utils.getMetaHeaders = function getMetaHeaders(headers) {
    const metaHeaders = Object.create(null);
    Object.keys(headers).filter(h => h.startsWith('x-amz-meta-')).forEach(k => {
        metaHeaders[k] = headers[k];
    });
    return metaHeaders;
};

/**
 * Create a unique key for either a bucket or an object
 * @param {string} namespace - namespace of request
 * @param {string} resource - either bucketname or bucketname + objectname
 * @return {string} hash to use as bucket key or object key
 */
utils.getResourceUID = function getResourceUID(namespace, resource) {
    return crypto.createHash('md5').update(namespace + resource).digest('hex');
};


/**
 * Modify http request object
 * @param {object} request - http request object
 * @return {object} request object with additional attributes
 */
utils.normalizeRequest = function normalizeRequest(request) {
    request.query = this.decodeQuery(url.parse(request.url, true).query);
    // TODO: make the namespace come from a config variable.
    request.namespace = 'default';
    // Parse bucket and/or object names from request
    const resources = this.getResourceNames(request);
    request.bucketName = resources.bucket;
    request.objectKey = resources.object;
    request.parsedHost = resources.host;
    request.path = resources.path;
    request.parsedContentLength =
        Number.parseInt(request.headers['content-length'], 10);
    return request;
};

utils.mapHeaders = function mapHeaders(headers, addHeaders) {
    if (addHeaders['response-content-type']) {
        headers['Content-Type'] = addHeaders['response-content-type'];
    }
    if (addHeaders['response-content-language']) {
        headers['Content-Language'] = addHeaders['response-content-language'];
    }
    if (addHeaders['response-expires']) {
        headers.Expires = addHeaders['response-expires'];
    }
    if (addHeaders['response-cache-control']) {
        headers['Cache-Control'] = addHeaders['response-cache-control'];
    }
    if (addHeaders['response-content-disposition']) {
        headers['Content-Disposition'] =
        addHeaders['response-content-disposition'];
    }
    if (addHeaders['response-content-encoding']) {
        headers['Content-Encoding'] = addHeaders['response-content-encoding'];
    }
    return headers;
};


utils.convertToXml = function convertToXml(infoToConvert, jsonConstructer) {
    const constructedJSON = jsonConstructer(infoToConvert);
    return xmlService(constructedJSON,
        { declaration: { standalone: 'yes', encoding: 'UTF-8' } });
};

utils.decodeQuery = function decodeQuery(query) {
    const decodedQuery = {};
    Object.keys(query).forEach(x => {
        const key = decodeURIComponent(x);
        const value = decodeURIComponent(query[x]);
        decodedQuery[key] = value;
    });
    return decodedQuery;
};

export default utils;
