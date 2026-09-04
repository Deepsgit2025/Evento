const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'src/app/(tabs)');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const allFiles = walk(tabsDir);

allFiles.forEach(file => {
    // Calculate depth relative to src
    // src/app/(tabs)/...
    // Let's just find the relative path from the file's DIRECTORY to src
    const fileDir = path.dirname(file);
    const srcDir = path.join(__dirname, 'src');
    
    // How many '..' do we need to get from fileDir to srcDir?
    const relative = path.relative(fileDir, srcDir);
    // relative will be like '..\..\..'
    
    // We expect imports to match this relative path.
    // If the file uses '../../../' but it needs '../../../../', we should fix it.
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Replace all occurrences of ../../../ (and variations) with the correct one
    // But ONLY if it's pointing to components, theme, services, database
    // The safest way is to use regex to find imports that go up some number of levels and match our known src folders.
    
    const importRegex = /from\s+['"]((?:\.\.\/)+)(components|theme|services|database|hooks|constants)/g;
    
    let modified = false;
    const newContent = content.replace(importRegex, (match, dots, folder) => {
        // dots is like '../../../'
        // we want it to be `relative/`
        // but relative uses backslashes on windows. We need forward slashes.
        const correctDots = relative.replace(/\\/g, '/') + '/';
        
        if (dots !== correctDots) {
            console.log(`Fixing import in ${file}: ${dots} -> ${correctDots}`);
            modified = true;
            return `from '${correctDots}${folder}`;
        }
        return match;
    });
    
    if (modified) {
        fs.writeFileSync(file, newContent, 'utf8');
    }
});
console.log('Done fixing relative imports');
