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

app.get('/shrines/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid shrine id' })
  }
  const shrine = await prisma.shrine.findUnique({
    where: { id },
    include: { deities: { include: { deity: true } } }
  })
  if (!shrine) return res.status(404).json({ error: 'Shrine not found' })
  res.json(shrine)
})

app.get('/deities', async (_req, res) => {
  const deities = await prisma.deity.findMany({
    include: { shrines: { include: { shrine: true } } }
  })
  res.json(deities)
})

app.get('/deities/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid deity id' })
  const deity = await prisma.deity.findUnique({
    where: { id },
    include: { shrines: { include: { shrine: true } } }
  })
  if (!deity) return res.status(404).json({ error: 'Deity not found' })
  res.json(deity)
})

app.get('/shrines/:id/ranking', async (req, res) => {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid shrine id' })
  }

  const ranking = await prisma.$queryRawUnsafe<{
    userId: string
    name: string
    count: number
  }[]>(
    `SELECT "userId", "User"."name", COUNT(*) AS count
     FROM "Visit"
     JOIN "User" ON "Visit"."userId" = "User"."id"
     WHERE "Visit"."shrineId" = $1
     GROUP BY "userId", "User"."name"
     ORDER BY count DESC
     LIMIT 5`,
    id
  )

  res.json(ranking)
})

app.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany()
  res.json(users)
})

app.post('/users', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const user = await prisma.user.create({ data: { name } })
  res.status(201).json(user)
})

app.get('/users/:userId', async (req, res) => {
  const { userId } = req.params
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
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
