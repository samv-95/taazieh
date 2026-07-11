import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import BannerSlider from "../components/BannerSlider";
import CategorizedScripts from "../components/CategorizedScripts";

function Home() {
  return (
    <>
      <BannerSlider />

      <div className="container">
        <CategorizedScripts />
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Home />
      </Layout>
    </ProtectedRoute>
  );
}