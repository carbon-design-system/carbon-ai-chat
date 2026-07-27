import carbonConfig from 'prettier-config-carbon';

export default {
  ...carbonConfig,
  /* Disable automatic line wrapping in markdown files, 
  this was important for JSDoc links to not break into two lines leading
   to errors in linking docs across pages*/
  proseWrap: 'never',
};
