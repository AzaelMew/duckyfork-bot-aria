// src/contracts/imgur/imgurUploader.js

const ImgurUploaderClass = require('./imgurUploader');
const tokens = require('./imgurTokens');

const uploader = new ImgurUploaderClass(tokens);
module.exports = uploader;