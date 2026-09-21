/**
 * Lazy agent registry.
 *
 * Importing every agent at process startup retained all agent prompts, tools,
 * memory adapters, and provider code even when a request needed only one.
 * Dynamic imports keep the baseline server small and cache the selected module
 * naturally after its first use.
 */
export async function getAgentByType(type: string) {
  switch (type) {
    case 'property':
      return (await import('./agents/property-agent')).propertyAgent
    case 'insurance':
      return (await import('./agents/insurance-agent')).insuranceAgent
    case 'car_dealer':
      return (await import('./agents/car-dealer-agent')).carDealerAgent
    case 'travel':
      return (await import('./agents/travel-agent')).travelAgent
    case 'sales':
      return (await import('./agents/sales-agent')).salesAgent
    case 'legal':
      return (await import('./agents/legal-agent')).legalAgent
    default:
      return null
  }
}

/** The built-in Studio agent (conversational image generation). */
export async function getStudioAgent() {
  return (await import('./agents/studio-agent')).studioAgent
}
