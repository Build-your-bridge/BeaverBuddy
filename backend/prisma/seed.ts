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
    },
    {
      name: 'Canadiens Beaver',
      description: 'Official Montreal Canadiens jersey for Billy!',
      image: '/images/beaver/canadiens/wave.png',
      price: 400,
      rarity: OutfitRarity.EPIC
    },
    {
      name: 'Chef Beaver',
      description: 'Billy in his chef hat - ready to cook up some fun!',
      image: '/images/beaver/chef/wave.png',
      price: 300,
      rarity: OutfitRarity.RARE
    },
    {
      name: 'Blue Jays Beaver',
      description: 'Official Toronto Blue Jays baseball cap!',
      image: '/images/beaver/jays/jays.png',
      price: 350,
      rarity: OutfitRarity.RARE
    },
    {
      name: 'Moose Beaver',
      description: 'Billy with his moose antlers - majestic and fun!',
      image: '/images/beaver/moose/moose_non_remove-removebg-preview.png',
      price: 250,
      rarity: OutfitRarity.COMMON
    },
    {
      name: 'Snowboard Beaver',
      description: 'Billy ready for the slopes with his snowboard gear!',
      image: '/images/beaver/snowboard/snowboard.png',
      price: 375,
      rarity: OutfitRarity.RARE
    },
    {
      name: 'Lumberjack Beaver',
      description: 'Billy in his flannel shirt and axe - ready to chop wood!',
      image: '/images/beaver/lumberjack/wave.png',
      price: 325,
      rarity: OutfitRarity.RARE
    },
    {
      name: 'Barista Beaver',
      description: 'Billy serving up double-doubles at Tim Hortons!',
      image: '/images/beaver/tim hortons barista/default.png',
      price: 275,
      rarity: OutfitRarity.COMMON
    },
    {
      name: 'Arctic Beaver',
      description: 'Billy bundled up for the cold Canadian winter!',
      image: '/images/beaver/arctic/wave.png',
      price: 300,
      rarity: OutfitRarity.RARE
    },
    {
      name: 'Fisherman Beaver',
      description: 'Billy with his fishing rod - ready to catch some fish!',
      image: '/images/beaver/fisherman/default.png',
      price: 325,
      rarity: OutfitRarity.RARE
    }
  ]

  // Get all outfit names from the seed data
  const seedOutfitNames = outfits.map(o => o.name)

  // Delete any outfits that are not in the seed data
  await prisma.outfit.deleteMany({
    where: {
      name: {
        notIn: seedOutfitNames
      }
    }
  })

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