const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, './public/index.html'), 'utf8');

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: indexHtml,
  };
};
