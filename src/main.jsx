import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Limpia el service worker de la versión anterior de la aplicación.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((list) => {
    list.forEach((registration) => registration.unregister());
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
