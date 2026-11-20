const config = require("../../../config.json");
const uploader = require('../../contracts/Imgur/imgurExport');



async function uploadImage(image) {
  const response = await uploader.uploadBuffer(image);

  if (!response.url) {
    // eslint-disable-next-line no-throw-literal
    console.log(response)
    throw "An error occured while uploading the image. Please try again later.";
  }

  return response;
}

module.exports = { uploadImage };
