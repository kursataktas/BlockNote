import type { Project } from "../gen";

const template = (
  project: Project
) => `// AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(
  // <React.StrictMode >
  <App />
  // </React.StrictMode>
);`;

export default template;
