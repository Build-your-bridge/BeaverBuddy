# -*- coding: utf-8 -*-
import sys
import io
import requests
import json
from datetime import datetime, timedelta

# Set UTF-8 encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TICKETMASTER_APIKEY = "VIK7LDAmqaaUyGDsxzsjPeM05VASae9n"
BASE_URL = "https://app.ticketmaster.com/discovery/v2"

def test_basic_search():
    """Test basic event search"""
    endpoint = f"{BASE_URL}/events.json"
    
    params = {
        'apikey': TICKETMASTER_APIKEY,
        'city': 'Toronto',
        'countryCode': 'CA',
        'size': 5
    }
    
    print(f"=== BASIC SEARCH TEST ===")
    print(f"Searching for events in Toronto, Canada\n")
    
    response = requests.get(endpoint, params=params)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if '_embedded' in data and 'events' in data['_embedded']:
            events = data['_embedded']['events']
            print(f"Found {len(events)} events\n")
            for i, event in enumerate(events, 1):
                print(f"{i}. {event.get('name', 'N/A')}")
                classifications = event.get('classifications', [{}])[0]
                print(f"   Category: {classifications.get('segment', {}).get('name', 'N/A')}")
                print(f"   Genre: {classifications.get('genre', {}).get('name', 'N/A')}")
    print("\n")

def test_filter_by_category():
    """Test filtering by event categories (segments)"""
    endpoint = f"{BASE_URL}/events.json"
    
    # Available segments: Music, Sports, Arts & Theatre, Film, Miscellaneous
    categories = ['Music', 'Sports', 'Arts & Theatre']
    
    print(f"=== CATEGORY FILTER TEST ===")
    
    for category in categories:
        params = {
            'apikey': TICKETMASTER_APIKEY,
            'city': 'Toronto',
            'countryCode': 'CA',
            'segmentName': category,
            'size': 3
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('_embedded', {}).get('events', []))
            print(f"\n📂 {category}: {count} events found")
            
            if count > 0:
                events = data['_embedded']['events']
                for event in events[:2]:  # Show first 2
                    print(f"   • {event.get('name', 'N/A')}")
    print("\n")

def test_filter_by_genre():
    """Test filtering by genre within a segment"""
    endpoint = f"{BASE_URL}/events.json"
    
    # Music genres: Rock, Pop, Country, Hip-Hop/Rap, etc.
    # Sports genres: Hockey, Basketball, Baseball, Football, Soccer, etc.
    genres = [
        ('Sports', 'Hockey'),
        ('Music', 'Rock'),
        ('Music', 'Hip-Hop/Rap')
    ]
    
    print(f"=== GENRE FILTER TEST ===")
    
    for segment, genre in genres:
        params = {
            'apikey': TICKETMASTER_APIKEY,
            'city': 'Toronto',
            'countryCode': 'CA',
            'segmentName': segment,
            'genreName': genre,
            'size': 3
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('_embedded', {}).get('events', []))
            print(f"\n🎯 {segment} > {genre}: {count} events")
            
            if count > 0:
                events = data['_embedded']['events']
                for event in events[:2]:
                    print(f"   • {event.get('name', 'N/A')}")
    print("\n")

def test_filter_by_date_range():
    """Test filtering by date range"""
    endpoint = f"{BASE_URL}/events.json"
    
    # Date ranges
    today = datetime.now()
    next_week = today + timedelta(days=7)
    next_month = today + timedelta(days=30)
    
    date_ranges = [
        ('This Week', today.strftime('%Y-%m-%dT%H:%M:%SZ'), next_week.strftime('%Y-%m-%dT%H:%M:%SZ')),
        ('This Month', today.strftime('%Y-%m-%dT%H:%M:%SZ'), next_month.strftime('%Y-%m-%dT%H:%M:%SZ'))
    ]
    
    print(f"=== DATE RANGE FILTER TEST ===")
    
    for label, start_date, end_date in date_ranges:
        params = {
            'apikey': TICKETMASTER_APIKEY,
            'city': 'Toronto',
            'countryCode': 'CA',
            'startDateTime': start_date,
            'endDateTime': end_date,
            'size': 5
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('_embedded', {}).get('events', []))
            print(f"\n📅 {label}: {count} events")
            
            if count > 0:
                events = data['_embedded']['events']
                for event in events[:3]:
                    date = event.get('dates', {}).get('start', {}).get('localDate', 'N/A')
                    print(f"   • {event.get('name', 'N/A')} ({date})")
    print("\n")

def test_filter_by_keyword():
    """Test keyword search"""
    endpoint = f"{BASE_URL}/events.json"
    
    keywords = ['hockey', 'concert', 'comedy']
    
    print(f"=== KEYWORD FILTER TEST ===")
    
    for keyword in keywords:
        params = {
            'apikey': TICKETMASTER_APIKEY,
            'city': 'Toronto',
            'countryCode': 'CA',
            'keyword': keyword,
            'size': 3
        }
        
        response = requests.get(endpoint, params=params)
        
        if response.status_code == 200:
            data = response.json()
            count = len(data.get('_embedded', {}).get('events', []))
            print(f"\n🔍 '{keyword}': {count} events")
            
            if count > 0:
                events = data['_embedded']['events']
                for event in events[:2]:
                    print(f"   • {event.get('name', 'N/A')}")
    print("\n")

def test_combined_filters():
    """Test combining multiple filters"""
    endpoint = f"{BASE_URL}/events.json"
    
    print(f"=== COMBINED FILTERS TEST ===")
    print("Filter: Sports + Hockey + Toronto + This Month\n")
    
    today = datetime.now()
    next_month = today + timedelta(days=30)
    
    params = {
        'apikey': TICKETMASTER_APIKEY,
        'city': 'Toronto',
        'countryCode': 'CA',
        'segmentName': 'Sports',
        'genreName': 'Hockey',
        'startDateTime': today.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'endDateTime': next_month.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'size': 5,
        'sort': 'date,asc'  # Sort by date ascending
    }
    
    response = requests.get(endpoint, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if '_embedded' in data and 'events' in data['_embedded']:
            events = data['_embedded']['events']
            print(f"Found {len(events)} hockey events in Toronto:")
            for event in events:
                date = event.get('dates', {}).get('start', {}).get('localDate', 'N/A')
                venue = event.get('_embedded', {}).get('venues', [{}])[0].get('name', 'N/A')
                print(f"   • {event.get('name', 'N/A')}")
                print(f"     Date: {date} | Venue: {venue}")
    print("\n")

def get_available_filters():
    """Display all available Ticketmaster filters"""
    print(f"{'='*80}")
    print(f"TICKETMASTER AVAILABLE FILTERS")
    print(f"{'='*80}\n")
    
    filters = {
        "📍 Location Filters": [
            "city - City name (e.g., 'Toronto')",
            "stateCode - State/Province code (e.g., 'ON')",
            "countryCode - Country code (e.g., 'CA')",
            "postalCode - Postal/ZIP code",
            "latlong - Latitude,Longitude coordinates",
            "radius - Search radius in miles"
        ],
        "📂 Category Filters": [
            "segmentName - Music, Sports, Arts & Theatre, Film, Miscellaneous",
            "segmentId - Segment ID",
            "genreName - Rock, Pop, Hockey, Basketball, etc.",
            "genreId - Genre ID",
            "subGenreName - More specific sub-genre",
            "subGenreId - Sub-genre ID"
        ],
        "📅 Date/Time Filters": [
            "startDateTime - Start date/time (ISO 8601 format)",
            "endDateTime - End date/time (ISO 8601 format)",
            "onsaleStartDateTime - On-sale start date/time",
            "onsaleEndDateTime - On-sale end date/time"
        ],
        "🔍 Search Filters": [
            "keyword - Search keyword",
            "attractionId - Specific attraction ID",
            "venueId - Specific venue ID",
            "promoterId - Specific promoter ID"
        ],
        "⚙️ Result Options": [
            "size - Number of results (default: 20, max: 500)",
            "page - Page number (0-indexed)",
            "sort - Sort order (name,asc | date,asc | relevance,asc | etc.)",
            "locale - Locale code (e.g., en-us, fr-ca)"
        ],
        "🎫 Ticket Filters": [
            "includeTest - Include test events (yes/no/only)",
            "includeSpellcheck - Include spell check suggestions (yes/no)"
        ]
    }
    
    for category, items in filters.items():
        print(f"{category}")
        for item in items:
            print(f"  • {item}")
        print()

if __name__ == "__main__":
    try:
        get_available_filters()
        test_basic_search()
        test_filter_by_category()
        test_filter_by_genre()
        test_filter_by_date_range()
        test_filter_by_keyword()
        test_combined_filters()
        
        print(f"{'='*80}")
        print("✅ All tests completed!")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
