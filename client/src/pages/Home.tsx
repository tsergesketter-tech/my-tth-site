import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import AvailableOffers from '../components/profile/AvailableOffers';
import Destinations from '../components/Destinations';


function Home() {
  return (
    <>
      <Hero />
      <Destinations />
      <AvailableOffers />
    </>
  );
}

export default Home;