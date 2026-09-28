import SiteNav from '../components/landing/SiteNav'
import Hero from '../components/landing/Hero'
import ProofStrip from '../components/landing/ProofStrip'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import Coaches from '../components/landing/Coaches'
import Pricing from '../components/landing/Pricing'
import Faq from '../components/landing/Faq'
import FinalCta from '../components/landing/FinalCta'
import SiteFooter from '../components/landing/SiteFooter'
import '../styles/landing.css'

export default function Landing() {
  return (
    <div className="site">
      <a href="#main" className="skip-link" onClick={(e) => {
        e.preventDefault()
        document.getElementById('main')?.focus()
      }}>
        Skip to content
      </a>
      <SiteNav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <ProofStrip />
        <HowItWorks />
        <Features />
        <Coaches />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
