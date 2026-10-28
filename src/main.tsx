import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { environment } from "./config/environment";
import { bootstrapLocale } from "./i18n/bootstrap";
import "./Styles/global.css";
import { LocaleProvider } from './Context/LocaleProvider';
import { ToastProvider } from './Context/ToastProvider';
import { AuthProvider } from './Context/AuthProvider';

// Validate public configuration and set direction before the first React render.
void environment;
bootstrapLocale();
const root = document.getElementById("root");
if (!root) throw new Error("The application root element is missing.");
createRoot(root).render(
  <StrictMode>
    <LocaleProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></LocaleProvider>
  </StrictMode>,
);
