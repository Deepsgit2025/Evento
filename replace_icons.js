const fs = require('fs');
const path = require('path');

const iconMap = {
  'person.2.fill': 'people',
  'person.2': 'people-outline',
  'calendar': 'calendar-outline',
  'briefcase.fill': 'briefcase',
  'briefcase': 'briefcase-outline',
  'square.grid.2x2.fill': 'grid',
  'sparkles': 'sparkles',
  'bed.double.fill': 'bed',
  'bed.double': 'bed-outline',
  'heart.fill': 'heart',
  'heart.text.square': 'heart',
  'chevron.right': 'chevron-forward',
  'chevron.left': 'chevron-back',
  'chevron.down': 'chevron-down',
  'plus': 'add',
  'trash': 'trash-outline',
  'trash.fill': 'trash',
  'gearshape.fill': 'settings',
  'gearshape': 'settings-outline',
  'bell': 'notifications-outline',
  'bell.fill': 'notifications',
  'paperplane.fill': 'send',
  'paperplane': 'send-outline',
  'magnifyingglass': 'search',
  'xmark': 'close',
  'xmark.circle.fill': 'close-circle',
  'checkmark': 'checkmark',
  'checkmark.circle.fill': 'checkmark-circle',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'alert-circle',
  'info.circle': 'information-circle-outline',
  'info.circle.fill': 'information-circle',
  'envelope.open.fill': 'mail-open',
  'envelope': 'mail-outline',
  'indianrupeesign.circle.fill': 'wallet',
  'chart.bar.xaxis': 'bar-chart-outline',
  'paintbrush': 'color-palette-outline',
  'message': 'logo-whatsapp',
  'arrow.triangle.2.circlepath': 'sync-outline',
  'icloud.and.arrow.down': 'download-outline',
  'lock.shield': 'shield-checkmark-outline',
  'building.2': 'business-outline',
  'phone.fill': 'call',
  'map.fill': 'map',
  'clock.fill': 'time',
  'link': 'link-outline',
  'doc.text': 'document-text-outline',
  'person.crop.circle.badge.plus': 'person-add-outline',
  'text.bubble': 'chatbubbles-outline'
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes('expo-symbols')) {
    // Replace import
    content = content.replace(/import\s*\{\s*SymbolView(?:,\s*SFSymbol)?\s*\}\s*from\s*['"]expo-symbols['"];?/, "import { Ionicons } from '@expo/vector-icons';");
    content = content.replace(/import\s*\{\s*SFSymbol(?:,\s*SymbolView)?\s*\}\s*from\s*['"]expo-symbols['"];?/, "import { Ionicons } from '@expo/vector-icons';");
    
    // Replace SFSymbol type with IoniconsName type
    content = content.replace(/SFSymbol/g, "keyof typeof Ionicons.glyphMap");
    
    changed = true;
  }

  // Find all <SymbolView ... />
  const regex = /<SymbolView([^>]+)\/?>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const propsString = match[1];
    
    // Extract name, size, tintColor, weight, etc.
    let nameMatch = propsString.match(/name=['"]([^'"]+)['"]/);
    let nameExprMatch = propsString.match(/name=\{([^}]+)\}/);
    let name = '';
    let nameProp = '';
    
    if (nameMatch) {
      const sfName = nameMatch[1];
      const ionName = iconMap[sfName] || sfName.replace(/\./g, '-');
      nameProp = `name="${ionName}"`;
    } else if (nameExprMatch) {
      nameProp = `name={${nameExprMatch[1]}}`;
    }

    let sizeProp = propsString.match(/size=\{[^}]+\}/) ? propsString.match(/size=\{[^}]+\}/)[0] : (propsString.match(/size=['"][^'"]+['"]/) ? propsString.match(/size=['"][^'"]+['"]/)[0] : '');
    
    let colorPropMatch = propsString.match(/tintColor=\{([^}]+)\}/);
    let colorStringMatch = propsString.match(/tintColor=['"]([^'"]+)['"]/);
    let colorProp = '';
    if (colorPropMatch) {
      colorProp = `color={${colorPropMatch[1]}}`;
    } else if (colorStringMatch) {
      colorProp = `color="${colorStringMatch[1]}"`;
    }

    let stylePropMatch = propsString.match(/style=\{([^}]+)\}/);
    let styleProp = stylePropMatch ? `style={${stylePropMatch[1]}}` : '';

    const newTag = `<Ionicons ${nameProp} ${sizeProp} ${colorProp} ${styleProp} />`.replace(/\s+/g, ' ');
    
    content = content.replace(match[0], newTag);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('c:/Users/jaina/Evento/src', processFile);
