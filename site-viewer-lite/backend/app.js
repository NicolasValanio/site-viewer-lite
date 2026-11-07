const express = require('express');
const path = require('node:path');
const apiRoutes = require('./routes/api-routes');
const errorHandler = require('./middleware/error-handler');

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDist = path.resolve(__dirname, '../frontend/dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);
app.use('/api', (_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
});

app.use(express.static(frontendDist));
app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => {
  response.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error && !response.headersSent) {
      response.status(404).send('Frontend build not found.');
    }
  });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Site Viewer Lite listening on http://localhost:${port}`);
  });
}

module.exports = app;
