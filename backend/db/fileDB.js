const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'db.json')

const defaultDB = {
  users: [],
  products: [],
  bills: []
}

const readDB = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2))
    return { ...defaultDB }
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch {
    return { ...defaultDB }
  }
}

const writeDB = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

module.exports = { readDB, writeDB }
