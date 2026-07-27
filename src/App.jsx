import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./Home";
import Profile from "./Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/profile" element={<Profile />}></Route>
      </Routes>
    </BrowserRouter>
  );
}