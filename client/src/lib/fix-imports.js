// Script to update imports from @shared/schema to @/lib/types
// Run this with: node src/lib/fix-imports.js

const fs = require('fs');
const path = require('path');

const directoriesToSearch = [
  path.join(__dirname, '..', 'components'),
  path.join(__dirname, '..', 'hooks'),
  path.join(__dirname, '..', 'lib'),
  path.join(__dirname, '..', 'pages'),
];

const processFile = (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import statements
  let updatedContent = content.replace(
    /import\s+\{([^}]+)\}\s+from\s+["']@shared\/schema["'];?/g,
    'import {$1} from "@/lib/types";'
  );
  
  if (content !== updatedContent) {
    console.log(`Updated imports in: ${filePath}`);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }
};

const walkDirectory = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  });
};

// Start processing
console.log('Updating imports from @shared/schema to @/lib/types...');
directoriesToSearch.forEach(walkDirectory);
console.log('Done!'); 