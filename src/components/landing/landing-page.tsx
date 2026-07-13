'use client'

import { Navbar } from './navbar'
import { Hero } from './hero'
import { Problem } from './problem'
import { Solution } from './solution'
import { Product } from './product'
import { WhyWeWin } from './why-we-win'
import { PricingSection } from './pricing-section'
import { FinalCta } from './final-cta'
import { ScrollProgress } from './motion-components'

export const LandingPage = () => {
  return (
    <div className="relative">
      <ScrollProgress />
      <Navbar />

      {/* Warm gradient: hero → problem → solution */}
      <div className="bg-gradient-to-b from-[#E8804A] to-[#2A1408]">
        <Hero />
        <Problem />
        <Solution />
      </div>

      {/* Light: product modules, comparison, pricing */}
      <Product />
      <WhyWeWin />
      <PricingSection />

      {/* Warm gradient: final CTA + footer */}
      <div className="bg-gradient-to-b from-[#E8804A] to-[#2A1408]">
        <FinalCta />
      </div>
    </div>
  )
}
