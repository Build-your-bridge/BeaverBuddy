import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all available outfits
export const getAllOutfits = async (req: Request, res: Response) => {
  try {
    const outfits = await prisma.outfit.findMany({
      orderBy: { price: 'asc' }
    });
    res.json(outfits);
  } catch (error) {
    console.error('Error fetching outfits:', error);
    res.status(500).json({ error: 'Failed to fetch outfits' });
  }
};

// Get user's owned outfits
export const getUserOutfits = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const userOutfits = await prisma.userOutfit.findMany({
      where: { userId },
      include: {
        outfit: true
      }
    });

    res.json(userOutfits);
  } catch (error) {
    console.error('Error fetching user outfits:', error);
    res.status(500).json({ error: 'Failed to fetch user outfits' });
  }
};

// Buy an outfit
export const buyOutfit = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const outfitId = parseInt(req.params.id);

    // Check if user already owns this outfit
    const existingOutfit = await prisma.userOutfit.findUnique({
      where: {
        userId_outfitId: {
          userId,
          outfitId
        }
      }
    });

    if (existingOutfit) {
      return res.status(400).json({ error: 'You already own this outfit' });
    }

    // Get outfit details
    const outfit = await prisma.outfit.findUnique({
      where: { id: outfitId }
    });

    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    // Get user points
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < outfit.price) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: { points: user.points - outfit.price }
      });

      // Add outfit to user
      const userOutfit = await tx.userOutfit.create({
        data: {
          userId,
          outfitId
        },
        include: {
          outfit: true
        }
      });

      return userOutfit;
    });

    res.json(result);
  } catch (error) {
    console.error('Error buying outfit:', error);
    res.status(500).json({ error: 'Failed to buy outfit' });
  }
};

// Equip/unequip an outfit
export const toggleEquipOutfit = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const outfitId = parseInt(req.params.id);

    // Check if user owns this outfit
    const userOutfit = await prisma.userOutfit.findUnique({
      where: {
        userId_outfitId: {
          userId,
          outfitId
        }
      },
      include: {
        outfit: true
      }
    });

    if (!userOutfit) {
      return res.status(404).json({ error: 'You do not own this outfit' });
    }

    // Get the default outfit
    const defaultOutfit = await prisma.outfit.findFirst({
      where: { name: 'Default Beaver' }
    });

    if (userOutfit.equipped) {
      // If trying to unequip the currently equipped outfit
      if (userOutfit.outfit.name === 'Default Beaver') {
        // Don't allow unequipping the default outfit
        return res.json({ equipped: true });
      } else {
        // Unequip this outfit and equip the default instead
        await prisma.$transaction(async (tx) => {
          // Unequip the current outfit
          await tx.userOutfit.update({
            where: {
              userId_outfitId: {
                userId,
                outfitId
              }
            },
            data: { equipped: false }
          });

          // Equip the default outfit
          if (defaultOutfit) {
            await tx.userOutfit.update({
              where: {
                userId_outfitId: {
                  userId,
                  outfitId: defaultOutfit.id
                }
              },
              data: { equipped: true }
            });

            // Update user's equipped outfit
            await tx.user.update({
              where: { id: userId },
              data: { equippedOutfitId: defaultOutfit.id }
            });
          }
        });

        return res.json({ equipped: false });
      }
    } else {
      // Equipping an outfit - unequip all others first
      await prisma.$transaction(async (tx) => {
        // Unequip all outfits
        await tx.userOutfit.updateMany({
          where: { userId },
          data: { equipped: false }
        });

        // Equip the selected outfit
        await tx.userOutfit.update({
          where: {
            userId_outfitId: {
              userId,
              outfitId
            }
          },
          data: { equipped: true }
        });

        // Update user's equipped outfit
        await tx.user.update({
          where: { id: userId },
          data: { equippedOutfitId: outfitId }
        });
      });

      return res.json({ equipped: true });
    }
  } catch (error) {
    console.error('Error toggling outfit equip:', error);
    res.status(500).json({ error: 'Failed to toggle outfit equip' });
  }
};

// Get user points
export const getUserPoints = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ points: user.points });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Failed to fetch user points' });
  }
};