import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./Home";
import Profile from "./Profile";
import AdminPanel from "./AdminPanel";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/profile" element={<Profile />}></Route>
        <Route path="/admin" element={<AdminPanel />}></Route>
      </Routes>
    </BrowserRouter>
  );
}