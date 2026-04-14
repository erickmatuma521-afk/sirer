import app from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`SIRER API écoute sur le port ${config.port}`);
});
