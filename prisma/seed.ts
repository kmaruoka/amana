import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // create users
  const alice = await prisma.user.create({ data: { name: 'Alice' } })
  const bob = await prisma.user.create({ data: { name: 'Bob' } })

  // create deities
  const amaterasu = await prisma.deity.create({ data: { name: 'Amaterasu' } })
  const susanoo = await prisma.deity.create({ data: { name: 'Susanoo' } })

  // create shrines
  const shrine1 = await prisma.shrine.create({
    data: {
      name: 'Ise Grand Shrine',
      latitude: 34.4594,
      longitude: 136.7223,
      deities: {
        create: [{ deityId: amaterasu.id }]
      }
    }
  })

  const shrine2 = await prisma.shrine.create({
    data: {
      name: 'Izumo Taisha',
      latitude: 35.2036,
      longitude: 132.6853,
      deities: {
        create: [{ deityId: susanoo.id }]
      }
    }
  })

  // create visits
  await prisma.visit.create({ data: { userId: alice.id, shrineId: shrine1.id } })
  await prisma.visit.create({ data: { userId: bob.id, shrineId: shrine1.id } })
  await prisma.visit.create({ data: { userId: alice.id, shrineId: shrine2.id } })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
