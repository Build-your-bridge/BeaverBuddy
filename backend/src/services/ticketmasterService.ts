// src/services/ticketmasterService.ts
import fetch from 'node-fetch';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
    status?: {
      code?: string;
    };
  };
  sales?: {
    public?: {
      startDateTime?: string;
      endDateTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: {
        name: string;
      };
    }>;
  };
  classifications?: Array<{
    segment?: {
      name: string;
    };
    genre?: {
      name: string;
    };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
    currency: string;
  }>;
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page?: {
    totalElements: number;
  };
}

// Map frontend filter IDs to Ticketmaster classification IDs (official IDs from Ticketmaster API)
const FILTER_TO_CLASSIFICATION_ID: { [key: string]: string } = {
  'music': 'KZFzniwnSyZfZ7v7nJ',        // Music segment
  'sports': 'KZFzniwnSyZfZ7v7nE',       // Sports segment
  'children': 'KZFzniwnSyZfZ7v7n1',     // Family segment
  'theatre': 'KZFzniwnSyZfZ7v7na',      // Arts & Theatre segment
  'arts': 'KZFzniwnSyZfZ7v7na'          // Arts & Theatre segment
};

// For comedy, we need to use Arts & Theatre segment + Comedy genre name
const FILTER_NEEDS_GENRE: { [key: string]: { segmentId: string, genreName: string } } = {
  'comedy': { segmentId: 'KZFzniwnSyZfZ7v7na', genreName: 'Comedy' }
};

// Map to get proper category name for display
const CLASSIFICATION_TO_CATEGORY: { [key: string]: string } = {
  'KZFzniwnSyZfZ7v7nJ': 'music',
  'KZFzniwnSyZfZ7v7nE': 'sports',
  'KZFzniwnSyZfZ7v7n1': 'children',
  'KZFzniwnSyZfZ7v7na': 'arts'
};

export async function fetchTicketmasterEvents(
  filters: string[],
  city: string = 'Toronto',
  countryCode: string = 'CA',
  maxResults: number = 30
): Promise<TicketmasterEvent[]> {
  
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error('TICKETMASTER_API_KEY not found in environment');
    throw new Error('Ticketmaster API key not configured');
  }

  const allEvents: TicketmasterEvent[] = [];
  
  // Get date range: start 1 day from now, end 60 days from now for more event variety
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start 1 day from now
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // End 60 days from now
  
  // Use simple date format YYYY-MM-DDTHH:MM:SSZ
  const startDateTime = startDate.toISOString().split('.')[0] + 'Z';
  const endDateTime = endDate.toISOString().split('.')[0] + 'Z';
  
  console.log(`📅 Date range: ${startDateTime} to ${endDateTime} (1-60 days from now)`);
  console.log(`📅 Current date: ${new Date().toISOString()}`);
  console.log(`📅 Start date: ${startDate.toISOString()}`);
  console.log(`📅 End date: ${endDate.toISOString()}`);

  // Fetch events for each selected filter
  for (const filter of filters) {
    // Check if this filter needs special genre handling (like comedy)
    const genreConfig = FILTER_NEEDS_GENRE[filter];
    const classificationId = genreConfig ? genreConfig.segmentId : FILTER_TO_CLASSIFICATION_ID[filter];
    
    if (!classificationId) continue;

    const params: any = {
      apikey: apiKey,
      stateCode: 'ON',
      countryCode,
      classificationId,  // Use official Ticketmaster classification ID
      startDateTime,
      endDateTime,
      size: 20,  // Get more events per category to spread across the date range
      sort: 'random'  // Random sort to get diverse dates instead of clustering
    };

    // Add genre filter for comedy
    if (genreConfig) {
      params.genreName = genreConfig.genreName;
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/events.json?${queryString}`;

    try {
      console.log(`🎫 Fetching events for ${filter}:`, url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Ticketmaster API error for ${filter}: ${response.status}`);
        console.error(`Error details:`, errorBody);
        continue;
      }

      const data = await response.json() as TicketmasterResponse;
      
      console.log(`🎫 Raw Ticketmaster response for ${filter}:`);
      console.log(`  Total events in API: ${data._embedded?.events?.length || 0}`);
      console.log(`  Total elements: ${data.page?.totalElements || 0}`);
      
      if (!data._embedded?.events || data._embedded.events.length === 0) {
        console.warn(`⚠️ No events returned from Ticketmaster for ${filter}`);
        continue;
      }
      
      if (data._embedded?.events) {
        // Filter for quality events - keep it simple
        const qualityEvents = data._embedded.events.filter(event => {
          const eventName = event.name.toLowerCase();
          const eventStatus = event.dates?.status?.code?.toLowerCase() || '';
          
          // Check if sales have ended (sold out check)
          const salesEndDate = event.sales?.public?.endDateTime;
          const isSoldOut = salesEndDate && new Date(salesEndDate) < new Date();
          
          // Skip sold out, cancelled, postponed, or rescheduled events
          const badStatuses = ['offsale', 'soldout', 'cancelled', 'canceled', 'postponed', 'rescheduled'];
          if (badStatuses.includes(eventStatus) || isSoldOut) {
            console.log(`⚠️ Skipping ${event.name} - Status: ${eventStatus}${isSoldOut ? ' (sales ended)' : ''}`);
            return false;
          }
          
          // Only skip obvious low-quality events
          const lowQualityIndicators = ['open mic', 'karaoke night', 'trivia night', 'bingo', 'bar crawl'];
          const isLowQuality = lowQualityIndicators.some(indicator => eventName.includes(indicator));
          
          // Accept all events that aren't low quality and have valid status
          return !isLowQuality;
        });
        
        // Tag each quality event with proper category based on Ticketmaster's classification
        const taggedEvents = qualityEvents.map((event: any) => {
          const classificationId = event.classifications?.[0]?.segment?.id || event.classifications?.[0]?.genre?.id;
          const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() || '';
          
          // Use Ticketmaster's official classification ID to determine category
          let properCategory = CLASSIFICATION_TO_CATEGORY[classificationId] || filter;
          
          // Special handling for arts & theatre segment
          if (properCategory === 'arts') {
            if (genre.includes('comedy')) {
              properCategory = 'comedy';
            } else if (genre.includes('theatre') || genre.includes('play') || genre.includes('musical')) {
              properCategory = 'theatre';
            }
          }
          
          return {
            ...event,
            _filterCategory: properCategory
          };
        });
        
        allEvents.push(...taggedEvents);
        console.log(`✅ Found ${qualityEvents.length} quality events for ${filter} (filtered from ${data._embedded.events.length})`);
      }
    } catch (error) {
      console.error(`Error fetching events for ${filter}:`, error);
    }
  }

  console.log(`📊 Total events fetched: ${allEvents.length}`);
  
  // Shuffle events to prevent date clustering (Fisher-Yates shuffle)
  for (let i = allEvents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allEvents[i], allEvents[j]] = [allEvents[j], allEvents[i]];
  }
  console.log(`🔀 Events shuffled for date diversity`);
  
  return allEvents;
}

export function formatEventForAI(event: TicketmasterEvent, filterCategory: string): string {
  const venue = event._embedded?.venues?.[0];
  const classification = event.classifications?.[0];
  const date = event.dates.start.localDate;
  const time = event.dates.start.localTime || 'TBD';
  const priceRange = event.priceRanges?.[0];
  
  return `{
  "name": "${event.name}",
  "date": "${date}",
  "time": "${time}",
  "venue": "${venue?.name || 'TBD'}",
  "category": "${filterCategory}",
  "segmentType": "${classification?.segment?.name || 'Event'}",
  "genre": "${classification?.genre?.name || 'General'}",
  "price": "${priceRange ? `$${priceRange.min}-$${priceRange.max} ${priceRange.currency}` : 'Check website'}",
  "url": "${event.url}",
  "id": "${event.id}"
}`;
}
