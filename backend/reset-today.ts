import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetToday() {
  try {
    // Get today's date range to catch all possible timezone variations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    
    console.log('Searching for DailyQuest records between:');
    console.log('Start:', startOfToday.toISOString());
    console.log('End:', endOfToday.toISOString());
    
    // First, let's see what records exist
    const existing = await prisma.dailyQuest.findMany({
      where: {
        date: {
          gte: startOfToday,
          lt: endOfToday
        }
      },
      select: {
        id: true,
        userId: true,
        date: true
      }
    });
    
    console.log(`Found ${existing.length} record(s):`, existing);
    
    // Delete all daily quests for today
    const result = await prisma.dailyQuest.deleteMany({
      where: {
        date: {
          gte: startOfToday,
          lt: endOfToday
        }
      }
    });
    
    console.log(`✅ Deleted ${result.count} DailyQuest record(s)`);
    console.log('You can now do a fresh mental health check-in!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetToday();
