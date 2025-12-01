const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`
    ========================================
     MongoDB Connected Successfully
    ========================================
     Database: ${conn.connection.db.databaseName}
     Host: ${conn.connection.host}
     Port: ${conn.connection.port}
    ========================================
    `);

    // Connection events
    mongoose.connection.on('connected', () => {
      console.log(' Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(' Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(' MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (err) {
    console.error(' MongoDB Connection Error:', err.message);
    console.error('Make sure MongoDB is running!');
    process.exit(1);
  }
};

module.exports = connectDB;