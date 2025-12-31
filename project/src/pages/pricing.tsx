import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/navigation/navbar';
import Footer from '../components/landing/footer';
import { useAuthContext } from '../contexts/auth-context';
import { SignUpButton } from '@clerk/clerk-react';

export function PricingPage() {
  const { isSignedIn } = useAuthContext();

  const tiers = [
    {
      name: 'Surfer',
      id: 'tier-starter',
      planId: 'cplan_37Urit6iP1sN6DL0dCoemMPFk6Y', // Clerk plan ID
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
      planId: 'cplan_37UsCF3L7e3QLUIZkekrP2F3yJ4', // Clerk plan ID
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
      planId: 'cplan_37Ut4NTQDrrhSNkmg95mWUVb1PX', // Clerk plan ID
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

        {/* WaveRider Pricing Table with Clerk Integration */}
        <div className="mt-16">
          <div className="mx-auto max-w-4xl text-center mb-8">
            <h3 className="text-base font-semibold leading-7 text-[#d5b274]">Turn “Where did the money go?” into “Here’s what we do next.”</h3>
            <p className="mt-2 text-lg text-gray-300">
            Pick your plan and get an always-on coach that reads your revenue curve and helps you make the right moves before things feel tight.
            </p>
          </div>
          
          <div className="isolate mx-auto max-w-7xl grid grid-cols-1 gap-8 sm:mt-20 lg:grid-cols-3 lg:gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`flex flex-col justify-between rounded-3xl bg-foreground p-8 ring-1 ring-border xl:p-10 backdrop-blur-sm transition-all hover:ring-border/80 ${
                  tier.featured ? 'ring-2 ring-[#d5b274] scale-105 bg-foreground z-10' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-x-4">
                    <h3
                      id={tier.id}
                      className={`text-lg font-semibold leading-8 ${
                        tier.featured ? 'text-[#d5b274]' : 'text-background'
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
                  <p className="mt-4 text-sm leading-6 text-background/80">{tier.description}</p>
                  <p className="mt-6 flex items-baseline gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-background">{tier.price}</span>
                    {tier.price !== 'Custom' && <span className="text-sm font-semibold leading-6 text-background/80">/month</span>}
                  </p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-background/80">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <Check className="h-6 w-5 flex-none text-[#d5b274]" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Clerk Sign Up / Account Portal Buttons */}
                {tier.price !== 'Custom' ? (
                  <div className="mt-8">
                    {!isSignedIn ? (
                      // New user signup - store plan and redirect to onboarding
                      <SignUpButton mode="modal">
                        <button 
                          onClick={() => {
                            // Store selected plan for post-sign-up subscription
                            sessionStorage.setItem('selectedPlan', tier.planId);
                            sessionStorage.setItem('selectedPrice', tier.price);
                            sessionStorage.setItem('selectedPlanName', tier.name);
                          }}
                          className={`block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            tier.featured
                              ? 'bg-[#d5b274] text-background hover:bg-[#c5a264] focus-visible:outline-[#d5b274]'
                              : 'bg-background/10 text-background hover:bg-background/20 focus-visible:outline-background'
                          }`}
                        >
                          Get started
                        </button>
                      </SignUpButton>
                    ) : (
                      // Existing user - redirect to Clerk Account Portal for billing
                      <button 
                        onClick={() => {
                          // Store plan info for post-redirect handling
                          sessionStorage.setItem('upgradePlan', tier.planId);
                          sessionStorage.setItem('upgradePrice', tier.price);
                          sessionStorage.setItem('upgradePlanName', tier.name);
                          // Navigate to account page which uses RedirectToUserProfile
                          window.location.href = '/user';
                        }}
                        className={`block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          tier.featured
                            ? 'bg-[#d5b274] text-background hover:bg-[#c5a264] focus-visible:outline-[#d5b274]'
                            : 'bg-background/10 text-background hover:bg-background/20 focus-visible:outline-background'
                        }`}
                      >
                        {tier.name === 'Wave Rider' ? 'Upgrade to Pro' : 'Manage Plan'}
                      </button>
                    )}
                  </div>
                ) : (
                  <Link
                    to={tier.href}
                    className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      tier.featured
                        ? 'bg-[#d5b274] text-background hover:bg-[#c5a264] focus-visible:outline-[#d5b274]'
                        : 'bg-background/10 text-background hover:bg-background/20 focus-visible:outline-background'
                    }`}
                  >
                    Contact sales
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
