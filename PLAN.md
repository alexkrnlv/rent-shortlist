# London Rent Shortlist - Implementation Plan

## Overview
A modern web application to analyze and visualize rental properties in London on an interactive map. Built with future iOS/iPad conversion in mind using React Native compatibility.

## Key Decisions
- **AI-Powered Parsing**: Use Claude API to intelligently parse any property listing page
- **Framework**: React Native Web (allows future iOS conversion)
- **Storage**: Local browser storage with CSV export/import for backup
- **Design**: Modern, clean UI with map as the primary focus

---

## Google Maps API Setup Instructions

### Step 1: Create Google Cloud Account
1. Go to https://console.cloud.google.com/
2. Sign in with your Google account (or create one)
3. Accept the terms of service

### Step 2: Create a New Project
1. Click the project dropdown at the top (next to "Google Cloud")
2. Click "New Project"
3. Name it "Rent Shortlist"
4. Click "Create"
5. Wait for it to be created, then select it

### Step 3: Enable Required APIs
1. Go to "APIs & Services" → "Library"
2. Search for and enable each of these:
   - **Maps JavaScript API** (for displaying the map)
   - **Geocoding API** (for converting addresses to coordinates)
   - **Distance Matrix API** (for travel times/distances)
   - **Places API** (for address autocomplete - optional but useful)

### Step 4: Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (you'll need it later)
4. Click "Edit API Key" to add restrictions:
   - Under "Application restrictions": Select "HTTP referrers"
   - Add: `localhost:*` and `127.0.0.1:*` (for development)
   - Under "API restrictions": Select "Restrict key"
   - Select all 4 APIs you enabled above
5. Click "Save"

### Step 5: Enable Billing (Required)
1. Go to "Billing" in the left menu
2. Link a billing account (Google gives $200/month free credit)
3. Note: You won't be charged for normal usage - the free tier is generous

**Save your API key somewhere safe - you'll enter it when we run the app!**

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **Map**: Google Maps via @react-google-maps/api
- **State**: Zustand (lightweight, React Native compatible)
- **Icons**: Lucide React

### AI Integration
- **Claude API**: For intelligent page parsing
  - Extract property name, address, price, photos
  - Works with ANY property listing site
  - Falls back to manual entry if parsing fails

### Data Flow
```
User pastes URLs → Backend fetches HTML → Claude parses content →
Geocoding API → Distance Matrix API → Display on map
```

## Data Model

```typescript
interface Property {
  id: string;
  url: string;
  name: string;
  address: string;
  price?: string;
  bedrooms?: number;
  bathrooms?: number;
  thumbnail?: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  distances: {
    direct: number; // km
    publicTransport: { distance: string; duration: string } | null;
    walking: { distance: string; duration: string } | null;
    driving: { distance: string; duration: string } | null;
  } | null;
  comment: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'unresolved' | 'manual';
}

interface Settings {
  centerPoint: {
    name: string;
    lat: number;
    lng: number;
  };
  googleMapsApiKey: string;
  claudeApiKey: string;
}
```

## UI/UX Design

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 Rent Shortlist                    [Settings] [Export] [Add] │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│   SIDEBAR (350px)    │              MAP (flex-1)                │
│                      │                                          │
│  ┌────────────────┐  │     ┌─────┐                              │
│  │ Search/Filter  │  │     │ 📍  │  Property markers with       │
│  └────────────────┘  │     └─────┘  thumbnail + name visible    │
│                      │                                          │
│  ┌────────────────┐  │         ┌─────┐                          │
│  │ Property Card  │  │         │ 📍  │                          │
│  │ [Photo] Name   │  │         └─────┘                          │
│  │ Price | Dist   │  │                                          │
│  │ [Comment]      │  │              ⭐ Center Point              │
│  └────────────────┘  │                                          │
│                      │                                          │
│  ┌────────────────┐  │                                          │
│  │ Property Card  │  │                                          │
│  └────────────────┘  │                                          │
│                      │                                          │
│  ... scrollable ...  │                                          │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

### Design Principles
1. **Map First**: Map takes 70%+ of screen space
2. **Clean & Modern**: Soft shadows, rounded corners, subtle animations
3. **Information Density**: Show key info at a glance
4. **Visual Markers**: Custom markers showing property thumbnail
5. **Responsive Foundation**: Built to adapt (future mobile)

### Color Palette
- Primary: Deep blue (#1E40AF)
- Secondary: Warm amber (#F59E0B)
- Background: Light gray (#F9FAFB)
- Cards: White with subtle shadow
- Accent: Green for distances (#10B981)

## Features Breakdown

### Core Features
1. ✅ Bulk URL input (paste multiple links)
2. ✅ AI-powered property parsing (Claude)
3. ✅ Google Maps visualization
4. ✅ Custom markers with thumbnails
5. ✅ Distance calculations (all 4 types)
6. ✅ Configurable center point
7. ✅ Add/remove properties
8. ✅ Comments on properties
9. ✅ CSV export/import

### Filters
- Distance range (from center)
- Price range
- Number of bedrooms
- Property status (resolved/unresolved)

### Settings
- Center point (searchable address)
- Google Maps API key
- Claude API key

## File Structure

```
rent-shortlist/
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapView.tsx
│   │   │   ├── PropertyMarker.tsx
│   │   │   └── CenterMarker.tsx
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── PropertyList.tsx
│   │   │   ├── PropertyCard.tsx
│   │   │   ├── Filters.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── Modals/
│   │   │   ├── AddPropertyModal.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── PropertyDetailModal.tsx
│   │   │   └── ExportImportModal.tsx
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx
│   │       └── Card.tsx
│   ├── services/
│   │   ├── claude.ts          # AI parsing
│   │   ├── googleMaps.ts      # Maps, geocoding, distances
│   │   ├── propertyFetcher.ts # Fetch page content
│   │   └── storage.ts         # LocalStorage operations
│   ├── store/
│   │   ├── usePropertyStore.ts
│   │   └── useSettingsStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── csv.ts
│   │   ├── distance.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/
│   └── proxy.ts               # Simple proxy for CORS
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Implementation Phases

### Phase 1: Foundation ⏱️
- Project setup (Vite, React, TypeScript, Tailwind)
- Basic layout structure
- Store setup (Zustand)
- Type definitions

### Phase 2: Map Integration
- Google Maps component
- Basic markers
- Center point display
- Settings for API keys

### Phase 3: Property Management
- Add property modal (bulk input)
- Property list in sidebar
- Property cards
- Local storage persistence

### Phase 4: AI Parsing
- CORS proxy server
- Claude API integration
- Parse property pages
- Extract: name, address, price, photos

### Phase 5: Geocoding & Distances
- Address to coordinates
- Distance Matrix calculations
- Display all distance types

### Phase 6: Advanced Features
- Filters
- Comments
- CSV export/import
- Custom markers with thumbnails

### Phase 7: Polish
- Loading states & animations
- Error handling
- Empty states
- Final UI polish

---

## Ready to Build!

Once you have your Google Maps API key, provide it along with your Claude API key and I'll build the complete application.
