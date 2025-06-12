const fs = require('fs');
const https = require('https');

// Read missing images list
const missingImages = JSON.parse(fs.readFileSync('missing_images.json', 'utf8'));

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(`public/images/${filename}`);
    
    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        resolve(downloadImage(redirectUrl, filename));
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${filename}`);
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(`public/images/${filename}`, () => {});
      reject(err);
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
};

const downloadMissingImages = async () => {
  console.log(`🔄 Downloading ${missingImages.length} missing images...\n`);
  
  for (const item of missingImages) {
    try {
      await downloadImage(item.imageUrl, item.filename);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to download ${item.gameKey}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Finished downloading missing images!');
};

downloadMissingImages();