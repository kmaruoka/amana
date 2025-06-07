import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
const port = process.env.PORT || 3000

app.get('/shrines/nearby', async (req, res) => {
  const lat = parseFloat(req.query.lat as string)
  const lon = parseFloat(req.query.lon as string)
  const radius = parseInt(req.query.radius as string) || 100

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Invalid coordinates' })
  }

  // PostGIS distance calculation
  const shrines = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, latitude, longitude
     FROM "Shrine"
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )`,
    lon,
    lat,
    radius
  )

  res.json(shrines)
})

app.get('/shrines', async (_req, res) => {
  const shrines = await prisma.shrine.findMany({
    include: { deities: { include: { deity: true } } }
  })
  res.json(shrines)
})

app.post('/visits', async (req, res) => {
  const { userId, shrineId } = req.body
  if (!userId || !shrineId) {
    return res.status(400).json({ error: 'userId and shrineId required' })
  }

  try {
    const visit = await prisma.visit.create({
      data: {
        userId,
        shrineId: Number(shrineId)
      }
    })
    res.status(201).json(visit)
  } catch (e) {
    res.status(400).json({ error: 'Could not record visit' })
  }
})

app.get('/users/:userId/visits', async (req, res) => {
  const { userId } = req.params
  const visits = await prisma.visit.findMany({
    where: { userId },
    include: { shrine: true }
  })
  res.json(visits)
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
