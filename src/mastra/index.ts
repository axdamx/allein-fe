import { Mastra } from '@mastra/core'
import { Observability, MastraStorageExporter } from '@mastra/observability'
import { storage, vectorStore } from './config'

import { propertyAgent } from './agents/property-agent'
import { insuranceAgent } from './agents/insurance-agent'
import { carDealerAgent } from './agents/car-dealer-agent'
import { travelAgent } from './agents/travel-agent'
import { salesAgent } from './agents/sales-agent'
import { legalAgent } from './agents/legal-agent'

const vectors = { 'allein-vector': vectorStore }

const observability = process.env.MASTRA_PLATFORM_ACCESS_TOKEN
  ? new Observability({
      configs: {
        default: {
          serviceName: 'allein',
          exporters: [new MastraStorageExporter()],
        },
      },
    })
  : undefined

export const mastra = new Mastra({
  storage,
  vectors,
  ...(observability ? { observability } : {}),
  agents: {
    property: propertyAgent,
    insurance: insuranceAgent,
    car_dealer: carDealerAgent,
    travel: travelAgent,
    sales: salesAgent,
    legal: legalAgent,
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
