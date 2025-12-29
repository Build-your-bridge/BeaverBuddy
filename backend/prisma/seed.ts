import { PrismaClient, OutfitRarity } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding outfits...')

  const outfits = [
    {
      name: 'Default Beaver',
      description: 'Billy\'s classic look - simple and reliable!',
      image: '/images/beaver/default/default.png',
      price: 0,
      rarity: OutfitRarity.COMMON
    },
    {
      name: 'Hockey Beaver',
      description: 'Official Toronto Maple Leafs jersey for Billy!',
      image: '/images/beaver/hockey/wave.png',
      price: 400,
      rarity: OutfitRarity.EPIC
    },
    {
      name: 'Raptors Beaver',
      description: 'Official Toronto Raptors basketball jersey!',
      image: '/images/beaver/raptors/wave.png',
      price: 450,
      rarity: OutfitRarity.EPIC
    },
    {
      name: 'RCMP Beaver',
      description: 'Official Royal Canadian Mounted Police hat!',
      image: '/images/beaver/rcmp/wave.png',
      price: 350,
      rarity: OutfitRarity.RARE
    }
  ]

  for (const outfit of outfits) {
    const existing = await prisma.outfit.findFirst({
      where: { name: outfit.name }
    })

    if (existing) {
      // Update existing outfit
      await prisma.outfit.update({
        where: { id: existing.id },
        data: outfit
      })
    } else {
      // Create new outfit
      await prisma.outfit.create({
        data: outfit
      })
    }
  }

  console.log('Outfits seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })