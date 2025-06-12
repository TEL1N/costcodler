const fs = require('fs');
const path = require('path');

// Read your original games.json
const games = JSON.parse(fs.readFileSync('games.json', 'utf8'));

const createCleanGamesJson = () => {
  const cleanGames = {};
  let removedCount = 0;
  let keptCount = 0;
  
  console.log('🔍 Creating clean games.json without missing images...\n');
  
  for (const [gameKey, gameData] of Object.entries(games)) {
    const imageUrl = gameData.image;
    
    // Extract file extension from URL or default to .jpg
    const urlPath = new URL(imageUrl).pathname;
    const extension = path.extname(urlPath) || '.jpg';
    const filename = `${gameKey}${extension}`;
    const filePath = `public/images/${filename}`;
    
    // Only include games where the image file exists
    if (fs.existsSync(filePath)) {
      cleanGames[gameKey] = {
        ...gameData,
        image: `./images/${filename}` // Update to local path
      };
      keptCount++;
    } else {
      console.log(`❌ Removing ${gameKey}: ${gameData.name} (missing image)`);
      removedCount++;
    }
  }
  
  // Write the clean games file
  fs.writeFileSync('games_local.json', JSON.stringify(cleanGames, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Games kept: ${keptCount}`);
  console.log(`❌ Games removed: ${removedCount}`);
  console.log(`📁 Total original: ${Object.keys(games).length}`);
  console.log(`\n💾 Clean games file saved as: games_local.json`);
  console.log(`🎯 All games now have local image paths and verified images!`);
};

createCleanGamesJson();