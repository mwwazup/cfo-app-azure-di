import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-card py-12 border-t border-border">
      <div className="container px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src="/Master-Logo_white-on-white2.png" 
                alt="Big Fig CFO Logo" 
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-foreground">Wave Rider</span>
            </div>
            <p className="text-muted">
              Helping service business owners surf their revenue curve with confidence.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                ["Pricing", "/pricing"],
                ["Features", "/features"],
                ["Testimonials", "/testimonials"],
              ],
            },
            {
              title: "Resources",
              links: [
                ["Blog", "/blog"],
                ["Webinars", "/webinars"],
                ["Guides", "/guides"],
              ],
            },
            {
              title: "Company",
              links: [
                ["About", "/about"],
                ["Contact", "/contact"],
                ["Careers", "/careers"],
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4 text-foreground">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map(([text, href]) => (
                  <li key={href}>
                    <a href={href} className="text-muted hover:text-foreground transition-colors">
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted">
            © 2025 Big Fig CFO. All rights reserved.
          </div>
          <div className="flex gap-6">
            {[
              ["Terms", "/terms"],
              ["Privacy", "/privacy"],
              ["Cookies", "/cookies"],
            ].map(([label, link]) => (
              <a key={link} href={link} className="text-sm text-muted hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}