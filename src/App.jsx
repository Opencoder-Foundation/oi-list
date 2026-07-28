
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./Layout";
import Home from "./Home";
import Profile from "./Profile";
import AdminPanel from "./AdminPanel";
import Faq from "./Faq";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminPanel />} />
        <Route path="faq" element={<Faq />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;