import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MergePage from './pages/MergePage';
import SplitPage from './pages/SplitPage';
import CompressPage from './pages/CompressPage';
import PdfToImagePage from './pages/PdfToImagePage';
import ImageToPdfPage from './pages/ImageToPdfPage';
import RotatePage from './pages/RotatePage';
import OrganizePage from './pages/OrganizePage';
import WatermarkPage from './pages/WatermarkPage';
import PasswordProtectPage from './pages/PasswordProtectPage';
import PasswordRemovePage from './pages/PasswordRemovePage';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/merge" element={<MergePage />} />
            <Route path="/split" element={<SplitPage />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/pdf-to-image" element={<PdfToImagePage />} />
            <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
            <Route path="/rotate" element={<RotatePage />} />
            <Route path="/organize" element={<OrganizePage />} />
            <Route path="/watermark" element={<WatermarkPage />} />
            <Route path="/password-protect" element={<PasswordProtectPage />} />
            <Route path="/password-remove" element={<PasswordRemovePage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;