const fs = require('fs');
const path = require('path');

// Read your games.json
const games = JSON.parse(fs.readFileSync('games.json', 'utf8'));

const findMissingImages = () => {
  const missingImages = [];
  const existingImages = [];
  
  console.log('🔍 Checking for missing images...\n');
  
  for (const [gameKey, gameData] of Object.entries(games)) {
    const imageUrl = gameData.image;
    
    // Extract file extension from URL or default to .jpg
    const urlPath = new URL(imageUrl).pathname;
    const extension = path.extname(urlPath) || '.jpg';
    const filename = `${gameKey}${extension}`;
    const filePath = `public/images/${filename}`;
    
    if (!fs.existsSync(filePath)) {
      missingImages.push({
        gameKey,
        filename,
        imageUrl,
        name: gameData.name
      });
    } else {
      existingImages.push(filename);
    }
  }
  
  // Summary
  console.log(`📊 Summary:`);
  console.log(`✅ Downloaded: ${existingImages.length} images`);
  console.log(`❌ Missing: ${missingImages.length} images`);
  console.log(`📁 Total: ${Object.keys(games).length} games\n`);
  
  if (missingImages.length > 0) {
    console.log('🚨 Missing images:');
    missingImages.forEach((item, index) => {
      console.log(`${index + 1}. ${item.gameKey} - ${item.name}`);
      console.log(`   File: ${item.filename}`);
      console.log(`   URL: ${item.imageUrl}\n`);
    });
    
    // Save missing images list to JSON file
    fs.writeFileSync('missing_images.json', JSON.stringify(missingImages, null, 2));
    console.log('💾 Missing images list saved to missing_images.json');
    
    // Create a simple retry script
    const retryScript = `const fs = require('fs');
const https = require('https');

// Read missing images list
const missingImages = JSON.parse(fs.readFileSync('missing_images.json', 'utf8'));

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(\`public/images/\${filename}\`);
    
    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        resolve(downloadImage(redirectUrl, filename));
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(\`HTTP \${response.statusCode} for \${url}\`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(\`✅ Downloaded: \${filename}\`);
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(\`public/images/\${filename}\`, () => {});
      reject(err);
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error(\`Timeout downloading \${url}\`));
    });
  });
};

const downloadMissingImages = async () => {
  console.log(\`🔄 Downloading \${missingImages.length} missing images...\\n\`);
  
  for (const item of missingImages) {
    try {
      await downloadImage(item.imageUrl, item.filename);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(\`❌ Failed to download \${item.gameKey}: \${error.message}\`);
    }
  }
  
  console.log('\\n🎉 Finished downloading missing images!');
};

downloadMissingImages();`;
    
    fs.writeFileSync('download_missing.js', retryScript);
    console.log('📝 Retry script created: download_missing.js');
    console.log('\n🚀 To download missing images, run: node download_missing.js');
    
  } else {
    console.log('🎉 All images downloaded successfully! No missing files.');
  }
};

findMissingImages();