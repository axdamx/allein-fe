'use client'

import { Navbar } from './navbar'
import { ChromeDiscScene } from './chrome-disc'
import { Hero } from './hero'
import { Solutions } from './solutions'
import { Benefits } from './benefits'
import { Testimonials } from './testimonials'
import { PricingSection } from './pricing-section'
import { FinalCta } from './final-cta'

export function LandingPage() {
  return (
    <div className="relative">
      <Navbar />
      <ChromeDiscScene visible />

      <div className="bg-gradient-to-b from-[#E8804A] to-[#2A1408]">
        <Hero />
        <Solutions />
        <Benefits />
      </div>

      <Testimonials />
      <PricingSection />

      <div className="bg-gradient-to-b from-[#E8804A] to-[#2A1408]">
        <FinalCta />
      </div>
    </div>
  )
}
