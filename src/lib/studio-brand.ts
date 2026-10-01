import type { PostPlatform } from '@/server/marketing'

export interface StudioBrandKit {
  brandName: string
  audience: string
  voice: string
  colors: string[]
  logoAssetId: string | null
  logoUrl: string | null
  defaultHashtags: string[]
  disclaimer: string
}

export interface StudioPostTemplate {
  id: string
  name: string
  prompt: string
  platform: PostPlatform | null
  tone: string | null
  builtIn?: boolean
}

export const EMPTY_BRAND_KIT: StudioBrandKit = {
  brandName: '',
  audience: '',
  voice: '',
  colors: [],
  logoAssetId: null,
  logoUrl: null,
  defaultHashtags: [],
  disclaimer: '',
}

export const STARTER_POST_TEMPLATES: StudioPostTemplate[] = [
  {
    id: 'starter-listing',
    name: 'New listing spotlight',
    prompt: 'Introduce this new listing: [property type, location, price, standout features]. Explain who it suits and invite readers to enquire. Use only the facts provided.',
    platform: 'instagram',
    tone: null,
    builtIn: true,
  },
  {
    id: 'starter-market',
    name: 'Market insight',
    prompt: 'Share one useful insight about [market/location] based on these verified facts: [facts and source]. Explain what it means for buyers or sellers without promising returns.',
    platform: 'linkedin',
    tone: 'Professional',
    builtIn: true,
  },
  {
    id: 'starter-open-house',
    name: 'Open house invite',
    prompt: 'Invite people to an open house at [property and address] on [date and time]. Highlight [key features] and explain how to RSVP. Do not invent details.',
    platform: 'facebook',
    tone: 'Casual',
    builtIn: true,
  },
  {
    id: 'starter-faq',
    name: 'Client FAQ',
    prompt: 'Answer this common client question: [question]. Use these verified points: [facts]. Keep the answer clear, practical, and avoid unsupported guarantees.',
    platform: null,
    tone: null,
    builtIn: true,
  },
]
