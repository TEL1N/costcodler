const fs = require('fs');
const https = require('https');
const path = require('path');

// Ensure the images directory exists
if (!fs.existsSync('public/images')) {
  fs.mkdirSync('public/images', { recursive: true });
}

// Read your games.json
const games = JSON.parse(fs.readFileSync('games.json', 'utf8'));

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    // Skip if file already exists
    if (fs.existsSync(`public/images/${filename}`)) {
      console.log(`Skipped (exists): ${filename}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(`public/images/${filename}`);
    
    const request = https.get(url, (response) => {
      // Handle redirects
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
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(`public/images/${filename}`, () => {}); // Delete partial file
      reject(err);
    });
    
    // Set timeout
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
};

const downloadAllImages = async () => {
  const downloadPromises = [];
  let completed = 0;
  const total = Object.keys(games).length;
  
  console.log(`Starting download of ${total} images...`);
  
  for (const [gameKey, gameData] of Object.entries(games)) {
    const imageUrl = gameData.image;
    
    // Extract file extension from URL or default to .jpg
    const urlPath = new URL(imageUrl).pathname;
    const extension = path.extname(urlPath) || '.jpg';
    const filename = `${gameKey}${extension}`;
    
    const downloadPromise = downloadImage(imageUrl, filename)
      .then(() => {
        completed++;
        if (completed % 100 === 0) {
          console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
        }
        // Update the games object to use local paths
        games[gameKey].image = `./images/${filename}`;
      })
      .catch((error) => {
        console.error(`Failed to download ${gameKey}: ${error.message}`);
        // Keep original URL as fallback
      });
    
    downloadPromises.push(downloadPromise);
    
    // Batch downloads to avoid overwhelming the server
    if (downloadPromises.length >= 50) {
      await Promise.allSettled(downloadPromises.splice(0, 50));
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  try {
    // Process remaining downloads
    if (downloadPromises.length > 0) {
      await Promise.allSettled(downloadPromises);
    }
    
    // Write updated games.json with local paths
    fs.writeFileSync('games_local.json', JSON.stringify(games, null, 2));
    console.log('\n✅ All images processed and games_local.json created!');
    console.log(`📊 Successfully downloaded images for your Costcodle game`);
    
  } catch (error) {
    console.error('❌ Error during download process:', error);
  }
};

downloadAllImages();