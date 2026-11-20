const path = require('path');
const fs = require('fs');
const tokensPath = path.join(__dirname, 'imgurTokens.js');
const tokens = require(tokensPath); // dynamically require the current tokens
const fetch = require('node-fetch');
const FileType = require('file-type');

const UPLOAD_URL = 'https://api.imgur.com/3/image';
const TOKEN_REFRESH_URL = 'https://api.imgur.com/oauth2/token';


const validFileExtList = [
    'jpg', 'png', 'gif', 'apng', 'tif',
    'mp4', 'mpg', 'avi', 'webm', 'mov',
    'mkv', 'flv', 'wmv',
];

const imageMaxFileSize = 20000000;
const animatedImageAndVideoMaxFileSize = 200000000;

class ImgurAuthenticatedUploader {
    constructor({ clientId, clientSecret, accessToken, refreshToken }) {
        if (!clientId || !clientSecret || !accessToken || !refreshToken) {
            throw new Error('clientId, clientSecret, accessToken, and refreshToken are required');
        }

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiresAt = Date.now() + 3600 * 1000; // Assume 1-hour lifetime by default
    }


    async refreshAccessToken() {
        try {
            const response = await fetch(TOKEN_REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                }),
            });

            const data = await response.json();

            if (!data.access_token) {
                throw new Error('Failed to refresh access token');
            }

            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token || this.refreshToken;
            this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

            // 🔐 Persist updated tokens
            const updated = {
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
            };

            const content = `module.exports = ${JSON.stringify({
                clientId: this.clientId,
                clientSecret: this.clientSecret,
                accessToken: this.accessToken,
                refreshToken: this.refreshToken,
            }, null, 2)};\n`;

            fs.writeFileSync(tokensPath, content);

            console.log('🔄 Access token refreshed and saved');
        } catch (error) {
            console.error('❌ Failed to refresh token:', error.message);
            throw error;
        }
    }

    async ensureValidToken() {
        if (Date.now() >= this.tokenExpiresAt - 30 * 1000) {
            await this.refreshAccessToken();
        }
    }

    async getFileSize(filePathOrBuffer) {
        return Buffer.isBuffer(filePathOrBuffer)
            ? filePathOrBuffer.length
            : fs.statSync(filePathOrBuffer).size;
    }

    async isValidFile(filePathOrBuffer) {
        const fileType = Buffer.isBuffer(filePathOrBuffer)
            ? await FileType.fromBuffer(filePathOrBuffer)
            : await FileType.fromFile(filePathOrBuffer);

        if (!fileType || !validFileExtList.includes(fileType.ext)) return false;

        const fileSize = await this.getFileSize(filePathOrBuffer);
        return ['jpg', 'png'].includes(fileType.ext)
            ? fileSize < imageMaxFileSize
            : fileSize < animatedImageAndVideoMaxFileSize;
    }

    async __upload(base64Image) {
        await this.ensureValidToken();

        const response = await fetch(UPLOAD_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ image: base64Image }),
        });

        return await response.json();
    }

    async uploadBuffer(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            return { success: false, message: 'Expected a buffer.' };
        }

        if (!(await this.isValidFile(buffer))) {
            return { success: false, message: 'Not a valid file.' };
        }

        const base64Image = buffer.toString('base64');
        const json = await this.__upload(base64Image);

        return {
            success: json.success,
            status: json.status,
            url: json.data?.link,
            id: json.data?.id,
        };
    }

    async upload(filePath) {
        if (!filePath) return { success: false, message: 'filePath is required' };

        if (!(await this.isValidFile(filePath))) {
            return { success: false, message: 'Invalid file type or size' };
        }

        try {
            const buffer = fs.readFileSync(filePath);
            return await this.uploadBuffer(buffer);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteImage(imageId) {
        if (!imageId) return { success: false, message: 'imageId is required' };

        await this.ensureValidToken();

        const response = await fetch(`https://api.imgur.com/3/image/${imageId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });

        const json = await response.json();
        return { success: json.success, status: json.status };
    }
}

module.exports = ImgurAuthenticatedUploader;