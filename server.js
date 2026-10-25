/**
 * Start file for Hostinger (hPanel > Node.js) and for plain `node server.js`.
 * Set "Application startup file" to server.js.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./dist/main.js')
  .bootstrap()
  .catch((err) => {
    console.error('Saanidhya Events could not start:', err);
    process.exit(1);
  });
