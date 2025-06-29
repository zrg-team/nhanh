# Nhanh

Nhanh (Vietnamese for "fast") is a platform designed to accelerate the prototyping of web applications using AI. With Nhanh, you can quickly build, test, and iterate on web app ideas directly in your browser, leveraging both cloud-based and local large language models (LLMs) such as WebLLM and Wllama.

## Overview

Nhanh empowers developers and creators to:

- **Rapidly Prototype**: Instantly generate and modify web app prototypes using AI-driven workflows.
- **Flexible LLM Integration**: Work with both remote LLMs and local, in-browser models (WebLLM, Wllama) for privacy and speed.
- **Visual & Interactive**: Edit, guide, and interact with AI in a visual interface that enhances creativity and productivity.
- **Browser-Based & Free**: Everything runs locally in your browser, with optional cloud integrations for extended capabilities.

## Features

- **AI-Powered Prototyping**: Use LLMs to generate code, UI components, and workflows.
- **Custom Workflows**: Create and automate personal workflows tailored to your needs.
- **Node-Based Tools**: Experiment with prompt engineering, function calls, and vector databases in a visual environment.
- **Local & Cloud Models**: Choose between local models for privacy or cloud LLMs for more power.

## Tech Stack

Nhanh is built with a modern, high-performance stack:

- **Vite**: Fast build tool for web projects.
- **React**: UI library for building interactive interfaces.
- **ReactFlow**: Node-based visual programming.
- **PGLite**: Lightweight PostgreSQL client for browser and Node.js.
- **Voy**: WASM vector similarity search engine.
- **Memory Vector Database**: In-memory vector store for fast embedding search.
- **WebLLM**: Run LLMs directly in the browser.
- **Langchain & Langgraph**: Frameworks for LLM-powered applications and graph-based language models.
- **shadcn UI**: Modern UI components.
- **TypeORM**: ORM supporting SQLite WASM in browser.
- **Tailwind CSS**: Utility-first CSS framework.
- **i18next**: Internationalization.
- **React Router**: Declarative routing.
- **Zustand**: State management.
- **ESLint & Prettier**: Code quality and formatting.
- **magicui & kokonut**: Additional UI components.

## Project Structure

```
src/
├── assets/         # Images, fonts, static files
├── components/     # Reusable React components
├── constants/      # App constants and configs
├── css/            # Styling
├── hooks/          # Custom React hooks
├── i18n/           # Internationalization
├── lib/            # Utilities and integrations
├── pages/          # Route components
├── services/       # API and service logic
├── states/         # State management
├── utils/          # Helper functions
├── App.tsx         # Main app component
├── main.tsx        # App entry point
└── routes.tsx      # Route definitions
```

## Architecture

Nhanh uses a multi-threaded architecture for performance and responsiveness:

- **Main Thread**: UI and application logic.
- **Database Worker**: Handles data storage/retrieval (TypeORM + PGLite).
- **LLM Thread**: Manages LLM computations (WebLLM, Langchain).
- **Embedding Thread**: Handles vector database and embeddings.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone git@github.com:zrg-team/nhanh.git
   ```
2. **Install dependencies**:
   ```bash
   cd nhanh
   yarn install
   ```
3. **Run the development server**:
   ```bash
   yarn dev
   ```
4. **Open in browser**: Visit `http://localhost:PORT` to start using Nhanh.

## Contributing

Contributions are welcome! Please see our [contribution guidelines](https://github.com/zrg-team/nhanh/blob/main/CONTRIBUTING.md) for details.

## License

MIT License. See [LICENSE](./LICENSE) for more information.

## Contact

Questions or feedback? Open an issue or email [zerglingno2@outlook.com](mailto:zerglingno2@outlook.com).
