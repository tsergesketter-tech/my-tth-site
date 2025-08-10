import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Promotions from './pages/Promotions';
import MemberPage from './pages/Member';

const App = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/member" element={<MemberPage />} />

      </Routes>
      <Footer />
    </Router>
  );
};

export default App;