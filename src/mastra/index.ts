import { Mastra } from '@mastra/core'
import { storage, vectorStore } from './config'

import { propertyAgent } from './agents/property-agent'
import { insuranceAgent } from './agents/insurance-agent'
import { carDealerAgent } from './agents/car-dealer-agent'
import { travelAgent } from './agents/travel-agent'
import { salesAgent } from './agents/sales-agent'
import { legalAgent } from './agents/legal-agent'
import { studioAgent } from './agents/studio-agent'

const vectors = { 'allein-vector': vectorStore }

// NOTE: Mastra observability is disabled. The MastraStorageExporter tries to
// batch-write metrics (token counts, latency) into PostgresStore, but
// @mastra/pg doesn't implement the batch-metrics API — so every call logged
// "This storage provider does not support batch creating metrics". If you want
// observability later, configure it with a proper OTLP/console exporter or set
// up Mastra Cloud (the MASTRA_PLATFORM_ACCESS_TOKEN env var stays in .env for
// that future use).

export const mastra = new Mastra({
  storage,
  vectors,
  agents: {
    property: propertyAgent,
    insurance: insuranceAgent,
    car_dealer: carDealerAgent,
    travel: travelAgent,
    sales: salesAgent,
    legal: legalAgent,
    studio: studioAgent,
  },
})

export function getMastra() {
  return mastra
}

export function getAgentByType(type: string) {
  const id = `${type}-agent` as const
  try {
    return (mastra as any).getAgentById(id)
  } catch {
    return null
  }
}

/** The built-in Studio agent (conversational image/video generation). */
export function getStudioAgent() {
  return studioAgent
}
