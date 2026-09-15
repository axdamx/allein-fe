'use client'

import { FinalCta } from './final-cta'
import { Hero } from './hero'
import { Navbar } from './navbar'
import { PricingSection } from './pricing-section'
import { Problem } from './problem'
import { Product } from './product'
import { Solution } from './solution'
import { WhyWeWin } from './why-we-win'
import { ScrollProgress } from './motion-components'

export const LandingPage = () => {
  return (
    <div className="landing-page relative min-h-svh overflow-x-clip bg-[#F6F1E9] text-[#171713]">
      <ScrollProgress />
      <Navbar />

      <main>
        <Hero />
        <Problem />
        <Solution />
        <Product />
        <WhyWeWin />
        <PricingSection />
        <FinalCta />
      </main>
    </div>
  )
}
