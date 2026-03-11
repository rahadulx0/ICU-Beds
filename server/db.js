import mongoose from 'mongoose'
import './models/User.js'
import './models/Hospital.js'

const models = {
  User: mongoose.model('User'),
  Hospital: mongoose.model('Hospital'),
}

export async function initDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment')
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || undefined,
  })

  console.log('MongoDB connected')
  return mongoose.connection
}

export function getModels() {
  return models
}
