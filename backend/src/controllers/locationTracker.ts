// src/controllers/locationTracker.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

interface LocationUpdateBody {
  latitude: number;
  longitude: number;
  city?: string;
  province?: string;
}

export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { latitude, longitude, city, province } = req.body as LocationUpdateBody;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Update user location
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        latitude: latitude,
        longitude: longitude,
        city: city || null,
        province: province || null,
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        city: true,
        province: true,
      }
    });

    return res.status(200).json({
      success: true,
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        city: user.city,
        province: user.province,
      }
    });

  } catch (error: any) {
    console.error('Update location error:', error);
    return res.status(500).json({
      error: 'Failed to update location',
    });
  }
};

export const getUserLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        latitude: true,
        longitude: true,
        city: true,
        province: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      location: {
        latitude: user.latitude,
        longitude: user.longitude,
        city: user.city,
        province: user.province,
      }
    });

  } catch (error: any) {
    console.error('Get location error:', error);
    return res.status(500).json({
      error: 'Failed to get location',
    });
  }
};