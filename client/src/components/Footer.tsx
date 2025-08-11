import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-900 text-white text-sm">
      <div className="max-w-screen-xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-neutral-800">
        <div>
          <h4 className="font-semibold mb-4">Palonia Rewards</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Overview</a></li>
            <li><a href="#" className="hover:underline">Member Benefits</a></li>
            <li><a href="#" className="hover:underline">Earn Points</a></li>
            <li><a href="#" className="hover:underline">Redeem Points</a></li>
            <li><a href="#" className="hover:underline">Credit Card</a></li>
            <li><a href="#" className="hover:underline">Moments</a></li>
            <li><a href="#" className="hover:underline">Insiders</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Meetings & Events</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Overview</a></li>
            <li><a href="#" className="hover:underline">Business Meetings</a></li>
            <li><a href="#" className="hover:underline">Weddings</a></li>
            <li><a href="#" className="hover:underline">Group Travel</a></li>
            <li><a href="#" className="hover:underline">Social Events</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Deals & Packages</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Hotel & Flight Packages</a></li>
            <li><a href="#" className="hover:underline">Tours & Experiences</a></li>
            <li><a href="#" className="hover:underline">All-Inclusive Resorts</a></li>
            <li><a href="#" className="hover:underline">Vacation Clubs</a></li>
            <li><a href="#" className="hover:underline">Palonia Yacht Collection</a></li>
            <li><a href="#" className="hover:underline">Palonia Traveler</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Company</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">About Palonia</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
            <li><a href="#" className="hover:underline">Investor Relations</a></li>
            <li><a href="#" className="hover:underline">Newsroom</a></li>
            <li><a href="#" className="hover:underline">Leadership</a></li>
            <li><a href="#" className="hover:underline">Accessibility</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 grid md:grid-cols-2 items-center justify-between border-t border-neutral-800">
        <div className="mb-4 md:mb-0">
          <p className="text-xs text-neutral-400">&copy; 2025 Palonia Inc. All rights reserved. This is a Salesforce demo site. Please do not book or reveal personal information. Thank you!</p>
        </div>
        <div className="flex space-x-4 justify-end">
          <a href="#" className="hover:opacity-75">
            <span className="sr-only">Facebook</span>
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#" className="hover:opacity-75">
            <span className="sr-only">Instagram</span>
            <i className="fab fa-instagram"></i>
          </a>
          <a href="#" className="hover:opacity-75">
            <span className="sr-only">Twitter</span>
            <i className="fab fa-twitter"></i>
          </a>
          <a href="#" className="hover:opacity-75">
            <span className="sr-only">YouTube</span>
            <i className="fab fa-youtube"></i>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
