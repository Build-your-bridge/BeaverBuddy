import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function giveDefaultOutfitToAllUsers() {
  console.log('Giving Default Beaver outfit to all users...')

  // Find the Default Beaver outfit
  const defaultOutfit = await prisma.outfit.findFirst({
    where: { name: 'Default Beaver' }
  })

  if (!defaultOutfit) {
    console.error('Default Beaver outfit not found!')
    return
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true }
  })

  let count = 0
  for (const user of users) {
    // Check if user already has the default outfit
    const existing = await prisma.userOutfit.findUnique({
      where: {
        userId_outfitId: {
          userId: user.id,
          outfitId: defaultOutfit.id
        }
      }
    })

    if (!existing) {
      await prisma.userOutfit.create({
        data: {
          userId: user.id,
          outfitId: defaultOutfit.id,
          equipped: true, // Make it equipped for existing users too
        }
      })
      count++
    }
  }

  console.log(`Gave Default Beaver outfit to ${count} users`)
  await prisma.$disconnect()
}

giveDefaultOutfitToAllUsers()