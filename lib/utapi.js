
const utapiServer = require('utapi').UtapiServer.default;
const _config = require('./Config').default;

// start utapi server
export default function main() {
    if (_config.utapi) {
        utapiServer(_config.utapi);
    }
}
