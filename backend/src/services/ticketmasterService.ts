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

// Map frontend filter IDs to Ticketmaster segment names
const FILTER_TO_SEGMENT_MAP: { [key: string]: string } = {
  'music': 'Music',
  'sports': 'Sports',
  'children': 'Family',
  'comedy': 'Arts & Theatre',
  'theatre': 'Arts & Theatre',
  'arts': 'Arts & Theatre'
};

const FILTER_TO_GENRE_MAP: { [key: string]: string | undefined } = {
  'comedy': 'Comedy',
  'theatre': 'Theatre',
};

export async function fetchTicketmasterEvents(
  filters: string[],
  city: string = 'Toronto',
  countryCode: string = 'CA',
  maxResults: number = 30
): Promise<TicketmasterEvent[]> {
  
  if (!TICKETMASTER_API_KEY) {
    throw new Error('Ticketmaster API key not configured');
  }

  const allEvents: TicketmasterEvent[] = [];
  
  // Get date range: start 7 days from now, end 30 days from now for better planning
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Start 7 days from now
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // End 30 days from now
  
  // Use simple date format YYYY-MM-DDTHH:MM:SSZ
  const startDateTime = startDate.toISOString().split('.')[0] + 'Z';
  const endDateTime = endDate.toISOString().split('.')[0] + 'Z';

  // Fetch events for each selected filter
  for (const filter of filters) {
    const segmentName = FILTER_TO_SEGMENT_MAP[filter];
    const genreName = FILTER_TO_GENRE_MAP[filter];
    
    if (!segmentName) continue;

    const params: any = {
      apikey: TICKETMASTER_API_KEY,
      stateCode: 'ON', // Use Ontario instead of specific city for better results
      countryCode,
      segmentName,
      startDateTime,
      endDateTime,
      size: Math.ceil(maxResults / filters.length),
      sort: 'date,asc'
    };

    // Add genre filter if applicable
    if (genreName) {
      params.genreName = genreName;
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
        
        // Tag each quality event with proper category based on its actual segment/genre
        const taggedEvents = qualityEvents.map((event: any) => {
          const segment = event.classifications?.[0]?.segment?.name?.toLowerCase() || '';
          const genre = event.classifications?.[0]?.genre?.name?.toLowerCase() || '';
          
          // Determine proper category based on actual event type
          let properCategory = filter; // default to filter
          
          if (segment.includes('music')) {
            properCategory = 'music';
          } else if (segment.includes('sports')) {
            properCategory = 'sports';
          } else if (genre.includes('comedy')) {
            properCategory = 'comedy';
          } else if (genre.includes('theatre') || genre.includes('play') || genre.includes('musical')) {
            properCategory = 'theatre';
          } else if (segment.includes('family')) {
            properCategory = 'children';
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
