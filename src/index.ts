import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;

const app = createApp();
app.listen(PORT, () => {
  console.log(`personal-todo-app-api listening on port ${PORT}`);
});
