'use strict';

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`personal-todo-app-api listening on port ${PORT}`);
});
