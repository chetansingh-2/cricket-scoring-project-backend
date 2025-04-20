import app from './app';

const PORT = process.env.PORT || 5000;

console.log('Starting server...');

app.listen(PORT, () => {
  console.log('======================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('======================================');
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});