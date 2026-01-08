// Simple version - just find elements with max-width
// Paste this in Chrome DevTools Console

console.log('🔍 Finding elements with max-width constraints...\n');

const viewportWidth = window.innerWidth;
const results = [];

document.querySelectorAll('*').forEach(el => {
  const style = getComputedStyle(el);
  const maxW = style.maxWidth;
  const width = el.offsetWidth;
  
  if (maxW !== 'none' && maxW !== '100%' && maxW !== '' && !maxW.includes('100vw')) {
    const maxWidthNum = parseFloat(maxW);
    if (!isNaN(maxWidthNum) && maxWidthNum < viewportWidth) {
      results.push({
        el: el,
        maxWidth: maxW,
        width: width,
        classes: el.className,
        tag: el.tagName
      });
    }
  }
});

// Sort by width (narrowest first)
results.sort((a, b) => a.width - b.width);

console.log(`Found ${results.length} elements with max-width constraints:\n`);

results.forEach((item, i) => {
  console.log(`${i + 1}. ${item.tag} - Width: ${item.width}px, Max-width: ${item.maxWidth}`);
  console.log(`   Classes: ${item.classes}`);
  console.log(`   Element:`, item.el);
  console.log('---');
});





