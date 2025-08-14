import React from 'react';
import Navbar from '../navigation/navbar';
import Footer from './footer';

export default function HeroSection() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-20 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-24 items-center">
              <div className="flex flex-col gap-4">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">
                  Close the Revenue Gap. Build Momentum. Fuel the Future You Dream Of
                </h2>
                <p className="text-xl text-muted max-w-[600px]">
                  Wave RIDER Mastery turns real-life challenges into repeatable growth using the RIDR Framework.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <a href="/signup" className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200">
                    Ride Your Wave
                    <span className="ml-2">&rarr;</span>
                  </a>
                  <a href="/voice" className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-lg text-foreground hover:bg-card transition-colors duration-200">
                    See Demo
                  </a>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#9EC6C1] via-[#A69678] to-card opacity-90"></div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Wave RIDR Mastery? */}
        <section className="py-20 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6 text-foreground">What is Wave RIDR Mastery?</h2>
              <p className="text-lg text-muted mb-8">
                It's a strategic system that helps business owners understand their revenue curve, uncover what's holding 
                them back, and use 4 clear steps to close the gap between where they are and where they want to be.
              </p>
              <p className="text-base text-muted italic">
                "Carpe Mañana" – Your future is decided by what you do today, not tomorrow
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-background">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6 text-foreground">Ready to Ride Your Wave?</h2>
              <p className="text-xl text-muted mb-8">
                Join Wave RIDR Mastery today and transform your business growth journey.
              </p>
              <a href="/signup" className="inline-flex items-center justify-center rounded-md bg-accent text-background px-6 py-3 text-lg font-semibold hover:bg-accent/90 transition-colors duration-200">
                Join Wave RIDR Mastery
                <span className="ml-2">&rarr;</span>
              </a>
            </div>
          </div>
        </section>
      
        {/* RIDR Framework */}
        <section className="py-20 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">The RIDR Framework</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Results", desc: "Know your numbers. Track what matters using tools like Momentum Tracker to measure and understand your business performance." },
                { title: "Insight", desc: "Understand the why behind your wins and losses. Gain clarity on what's driving your success and what's holding you back." },
                { title: "Direction", desc: "Know where you're going with clear strategy, vision, and destination. Map out your path to sustainable growth." },
                { title: "Repeat", desc: "Create predictable wins, not random luck. Build systems that deliver consistent results and sustainable growth." },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-background rounded-lg p-6 shadow-sm border border-border hover:shadow-md transition-shadow duration-200">
                  <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
                  <p className="text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Most Business Owners Fail */}
        <section className="py-20 bg-background">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Most Business Owners Fail to Grow</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Battling Without a Plan", desc: "You're a technician first—you know the trade, but not how to win. Without a strategy, you're reacting instead of leading." },
                { title: "Missing Tomorrow's Growth", desc: "When everything demands your time, you miss the money signals. You know the work, but not the metrics behind growth." },
                { title: "Chasing Instead of Building", desc: "Gross sales aren't enough. Without pattern recognition, you keep guessing instead of growing smartly." },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-card rounded-lg p-6 shadow-sm border border-border hover:shadow-md transition-shadow duration-200">
                  <h3 className="text-xl font-bold mb-4 text-foreground">{title}</h3>
                  <p className="text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-card">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Trusted by business owners
              </h2>
              <p className="text-xl text-muted max-w-2xl mx-auto">
                Join thousands of business owners who rely on Wave RIDR for their growth journey.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-background rounded-lg p-8 shadow-sm border border-border">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  "Wave RIDR has transformed our business operations. The strategic insights help us make data-driven decisions that have improved our bottom line by 30%."
                </p>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      className="h-12 w-12 rounded-full object-cover"
                      src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
                      alt="Sarah Chen"
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-foreground">
                      Sarah Chen
                    </p>
                    <p className="text-sm text-muted">
                      CEO, TechCorp
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-lg p-8 shadow-sm border border-border">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-muted text-lg leading-relaxed mb-6">
                  "The framework saves us 20+ hours per week on planning. The predictive insights are incredibly accurate and valuable for strategic growth."
                </p>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      className="h-12 w-12 rounded-full object-cover"
                      src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face"
                      alt="Michael Rodriguez"
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-foreground">
                      Michael Rodriguez
                    </p>
                    <p className="text-sm text-muted">
                      Business Owner, GrowthCo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}