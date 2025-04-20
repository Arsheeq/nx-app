import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the title
document.title = "Nubinix Cloud Insights";

// Add meta tags
const meta = document.createElement('meta');
meta.name = 'description';
meta.content = 'Generate cloud utilization and billing reports for AWS and Azure resources';
document.head.appendChild(meta);

// Add favicon
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.href = 'https://cdn-icons-png.flaticon.com/512/4964/4964451.png';
document.head.appendChild(favicon);

// Add fonts
const fontsLink = document.createElement('link');
fontsLink.rel = 'stylesheet';
fontsLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontsLink);

createRoot(document.getElementById("root")!).render(<App />);
