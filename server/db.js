import mysql from 'mysql2/promise'

let pool

export async function initDB() {
  // First connect without database to create it if needed
  const tmpConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  })
  await tmpConn.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'icu_beds'}\``)
  await tmpConn.end()

  // Create connection pool
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'icu_beds',
    waitForConnections: true,
    connectionLimit: 10,
  })

  // Create tables
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      displayName VARCHAR(255) DEFAULT '',
      role ENUM('rep', 'moderator', 'admin') DEFAULT 'rep',
      status ENUM('active', 'pending') DEFAULT 'pending',
      phone VARCHAR(50) DEFAULT '',
      organization VARCHAR(255) DEFAULT '',
      assigned_hospitals JSON DEFAULT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address VARCHAR(500) DEFAULT '',
      lat DECIMAL(10, 7) DEFAULT 0,
      lng DECIMAL(10, 7) DEFAULT 0,
      total_beds INT DEFAULT 0,
      available_beds INT DEFAULT 0,
      icu_ventilators INT DEFAULT 0,
      available_ventilators INT DEFAULT 0,
      phone VARCHAR(50) DEFAULT '',
      email VARCHAR(255) DEFAULT '',
      website VARCHAR(500) DEFAULT '',
      emergency_contact VARCHAR(100) DEFAULT '',
      department VARCHAR(255) DEFAULT '',
      head_doctor VARCHAR(255) DEFAULT '',
      notes TEXT,
      assigned_rep_id INT DEFAULT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  console.log('MySQL tables ready')
  return pool
}

export function getDB() {
  return pool
}
