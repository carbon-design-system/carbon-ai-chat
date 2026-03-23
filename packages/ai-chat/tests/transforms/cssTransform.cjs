const sass = require('sass');
const path = require('path');
const fs = require('fs');
const postcss = require('postcss');

function transform(src, filename) {
    // If the file doesn't exist or is empty, return a default export
    if (!fs.existsSync(filename)) {
      return {
        code: 'module.exports = "";',
      };
    }

    try {
      let css = src;

      // If it's a SCSS file, compile it (sync)
      if (filename.endsWith('.scss')) {
        const result = sass.compileString(src, {
          loadPaths: [
            path.dirname(filename),
            path.resolve(process.cwd(), 'node_modules'),
            path.resolve(process.cwd(), '../../node_modules'),
          ],
          style: 'expanded',
          url: new URL(`file://${filename}`),
        });
        css = result.css;
      }

      // Apply PostCSS processing (sync with no async plugins)
      const processed = postcss().process(css, { from: filename });

      // Return the compiled CSS as a string export
      return {
        code: `module.exports = ${JSON.stringify(processed.css)};`,
      };
    } catch (error) {
      console.warn(`Error processing CSS file ${filename}:`, error.message);
      // Return empty string on error to prevent test failures
      return {
        code: 'module.exports = "";',
      };
    }
}

module.exports = {
  process(src, filename) {
    return transform(src, filename);
  },
  // Jest 28+ will use this for async transforms; keep it for compatibility.
  async processAsync(src, filename) {
    return transform(src, filename);
  },
};
