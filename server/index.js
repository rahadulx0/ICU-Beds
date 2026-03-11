import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initDB } from './db.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import hospitalRoutes from './routes/hospitals.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }
})

app.set('io', io)

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/hospitals', hospitalRoutes)

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000

initDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Database init failed:', err.message)
    process.exit(1)
  })
