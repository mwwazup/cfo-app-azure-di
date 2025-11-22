import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Navbar from '../components/navigation/navbar';
import Footer from '../components/landing/footer';
import { useAuthContext } from '../contexts/auth-context';

export function PricingPage() {
  const { isSignedIn } = useAuthContext();

  const tiers = [
    {
      name: 'Surfer',
      id: 'tier-starter',
      href: isSignedIn ? '/dashboard' : '/sign-in',
      price: '$49',
      description: 'Everything you need to start taking control of your business finances.',
      features: [
        'Basic Revenue Tracking',
        'Monthly Financial Reports',
        'Up to 3 Employees',
        'Standard Support',
        'F.R.A.P Challenge*',
      ],
      featured: false,
    },
    {
      name: 'Wave Rider',
      id: 'tier-pro',
      href: isSignedIn ? '/dashboard' : '/sign-in',
      price: '$99',
      description: 'Advanced analytics and coaching for growing businesses.',
      features: [
        'Everything in Surfer',
        'Advanced KPI Dashboard',
        'AI Financial Coach',
        'Unlimited Employees',
        'Employee LER Tracking',
        'Bonus & ROI Calculator',
        'Priority Support',
      ],
      featured: true,
    },
    {
      name: 'Wave Rider Mastery',
      id: 'tier-enterprise',
      href: 'mailto:sales@waverider.com',
      price: 'Custom',
      description: 'Dedicated support and custom integrations for large organizations.',
      features: [
        'Everything in Pro',
        'Custom API Integrations',
        'Dedicated Account Manager',
        'SSO & Advanced Security',
        'Custom Training & Onboarding',
        'SLA & Uptime Guarantees',
      ],
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-card flex flex-col">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 flex-1 w-full">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-[#d5b274]">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Choose the right plan for your business
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-300">
          Start with a 14-day free trial. No credit card required. 
          Upgrade, downgrade, or cancel at any time.
        </p>
        
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier, tierIdx) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl bg-gray-900/60 p-8 ring-1 ring-white/10 xl:p-10 backdrop-blur-sm transition-all hover:bg-gray-800/80 ${
                tier.featured ? 'ring-2 ring-[#d5b274] scale-105 bg-gray-800/80 z-10' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={`text-lg font-semibold leading-8 ${
                      tier.featured ? 'text-[#d5b274]' : 'text-white'
                    }`}
                  >
                    {tier.name}
                  </h3>
                  {tier.featured ? (
                    <p className="rounded-full bg-[#d5b274]/10 px-2.5 py-1 text-xs font-semibold leading-5 text-[#d5b274]">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-300">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-white">{tier.price}</span>
                  {tier.price !== 'Custom' && <span className="text-sm font-semibold leading-6 text-gray-300">/month</span>}
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-[#d5b274]" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to={tier.href}
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.featured
                    ? 'bg-[#d5b274] text-gray-900 hover:bg-[#c5a264] focus-visible:outline-[#d5b274]'
                    : 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white'
                }`}
              >
                {tier.price === 'Custom' ? 'Contact sales' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
