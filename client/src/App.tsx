import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Promotions from "./pages/Promotions";
import MemberPage from "./pages/Member";
import PaloniaCreditCards from "./pages/PaloniaCreditCards";
import SearchResults from "./pages/SearchResults"; // NEW


export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/credit-cards" element={<PaloniaCreditCards />} />
        <Route path="/search" element={<SearchResults />} />

      </Routes>
    </BrowserRouter>
  );
}