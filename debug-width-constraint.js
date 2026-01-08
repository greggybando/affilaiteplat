// Debug script to find width constraints
// Paste this in Chrome DevTools Console (F12 → Console tab)

console.log('🔍 Searching for elements with width constraints...\n');

const viewportWidth = window.innerWidth;
const threshold = viewportWidth * 0.7; // Elements narrower than 70% of viewport

let foundElements = [];

document.querySelectorAll('*').forEach((el, index) => {
  const style = getComputedStyle(el);
  const maxW = style.maxWidth;
  const width = el.offsetWidth;
  const classes = el.className;
  const id = el.id;
  
  // Check for max-width constraints
  if (maxW !== 'none' && maxW !== '100%' && !maxW.includes('100vw') && maxW !== '') {
    const maxWidthValue = parseFloat(maxW);
    if (!isNaN(maxWidthValue) && maxWidthValue < viewportWidth) {
      foundElements.push({
        element: el,
        maxWidth: maxW,
        actualWidth: width,
        classes: classes,
        id: id,
        tagName: el.tagName,
        maxWidthValue: maxWidthValue
      });
    }
  }
  
  // Also check for elements that are narrower than expected
  if (width < threshold && width > 100) { // Ignore very small elements
    const parentWidth = el.parentElement?.offsetWidth || viewportWidth;
    if (width < parentWidth * 0.8) { // Element is less than 80% of parent
      // Check if it's not already in foundElements
      const alreadyFound = foundElements.some(f => f.element === el);
      if (!alreadyFound) {
        foundElements.push({
          element: el,
          maxWidth: maxW,
          actualWidth: width,
          parentWidth: parentWidth,
          classes: classes,
          id: id,
          tagName: el.tagName,
          reason: 'narrower_than_parent'
        });
      }
    }
  }
});

// Sort by actual width (narrowest first)
foundElements.sort((a, b) => a.actualWidth - b.actualWidth);

console.log(`Found ${foundElements.length} potentially problematic elements:\n`);

foundElements.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.tagName}${item.id ? '#' + item.id : ''}`);
  console.log(`   Classes: ${item.classes || '(none)'}`);
  console.log(`   Max-width: ${item.maxWidth}`);
  console.log(`   Actual width: ${item.actualWidth}px`);
  if (item.parentWidth) {
    console.log(`   Parent width: ${item.parentWidth}px`);
  }
  console.log(`   Element:`, item.element);
  console.log(`   ---`);
});

// Also check for common Tailwind max-width classes
console.log('\n\n🔍 Checking for Tailwind max-w- classes:\n');
const tailwindMaxWidths = [
  'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl',
  'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl',
  'max-w-7xl', 'max-w-full', 'max-w-screen-sm', 'max-w-screen-md',
  'max-w-screen-lg', 'max-w-screen-xl', 'max-w-screen-2xl'
];

tailwindMaxWidths.forEach(className => {
  const elements = document.querySelectorAll(`.${className}`);
  if (elements.length > 0) {
    console.log(`\nFound ${elements.length} element(s) with class: ${className}`);
    elements.forEach((el, idx) => {
      const style = getComputedStyle(el);
      console.log(`  ${idx + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}`);
      console.log(`     Classes: ${el.className}`);
      console.log(`     Computed max-width: ${style.maxWidth}`);
      console.log(`     Actual width: ${el.offsetWidth}px`);
      console.log(`     Element:`, el);
    });
  }
});

// Check for mx-auto (centering) combined with max-width
console.log('\n\n🔍 Checking for mx-auto (centering) usage:\n');
const centeredElements = document.querySelectorAll('.mx-auto');
if (centeredElements.length > 0) {
  console.log(`Found ${centeredElements.length} element(s) with mx-auto:`);
  centeredElements.forEach((el, idx) => {
    const style = getComputedStyle(el);
    const maxW = style.maxWidth;
    const width = el.offsetWidth;
    const parentWidth = el.parentElement?.offsetWidth || viewportWidth;
    
    if (maxW !== 'none' && maxW !== '100%' || width < parentWidth * 0.9) {
      console.log(`\n  ${idx + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}`);
      console.log(`     Classes: ${el.className}`);
      console.log(`     Max-width: ${maxW}`);
      console.log(`     Actual width: ${width}px`);
      console.log(`     Parent width: ${parentWidth}px`);
      console.log(`     Element:`, el);
    }
  });
}

console.log('\n\n✅ Debug complete! Look for elements with max-width constraints or elements that are narrower than their parent.');






